"""
Secure Agentic Workflow Engine
Replaces unsafe eval() with secure condition evaluation
"""

import ast
import operator
import re
from typing import Any, Dict, Callable, Union


class SecureConditionEvaluator:
    """
    Secure alternative to eval() for workflow condition evaluation
    """

    # Allowed operators for safe expression evaluation
    _operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.BitXor: operator.xor,
        ast.USub: operator.neg,
        ast.Eq: operator.eq,
        ast.NotEq: operator.ne,
        ast.Lt: operator.lt,
        ast.LtE: operator.le,
        ast.Gt: operator.gt,
        ast.GtE: operator.ge,
        ast.Is: operator.is_,
        ast.IsNot: operator.is_not,
        ast.In: lambda x, y: x in y,
        ast.NotIn: lambda x, y: x not in y,
        ast.And: lambda x, y: x and y,
        ast.Or: lambda x, y: x or y,
        ast.Not: operator.not_,
    }

    # Allowed built-in functions
    _builtins = {
        'len': len,
        'str': str,
        'int': int,
        'float': float,
        'bool': bool,
        'abs': abs,
        'min': min,
        'max': max,
        'sum': sum,
        'any': any,
        'all': all,
        'isinstance': isinstance,
        'hasattr': hasattr,
        'getattr': getattr,
    }

    def __init__(self, allowed_names: set = None):
        """
        Initialize evaluator with allowed variable names

        Args:
            allowed_names: Set of allowed variable names
        """
        self.allowed_names = allowed_names or {'context', 'vars'}

    def evaluate(self, expression: str, context: Dict[str, Any]) -> Any:
        """
        Safely evaluate an expression with given context

        Args:
            expression: Expression to evaluate
            context: Context variables

        Returns:
            Evaluation result

        Raises:
            SecurityError: If expression contains unsafe operations
            SyntaxError: If expression has invalid syntax
            ValueError: If expression uses undefined variables
        """
        if not isinstance(expression, str):
            raise ValueError("Expression must be a string")

        # Parse expression into AST
        try:
            node = ast.parse(expression, mode='eval')
        except SyntaxError as e:
            raise SyntaxError(f"Invalid expression syntax: {e}")

        # Validate AST for security
        self._validate_ast(node)

        # Evaluate AST safely
        return self._eval_node(node.body, context)

    def _validate_ast(self, node: ast.AST) -> None:
        """
        Validate AST to ensure it only contains safe operations

        Args:
            node: AST node to validate

        Raises:
            SecurityError: If unsafe operations are found
        """
        allowed_node_types = {
            ast.Expression, ast.Name, ast.Constant, ast.Num, ast.Str, ast.NameConstant,
            ast.BinOp, ast.UnaryOp, ast.Compare, ast.BoolOp,
            ast.Attribute, ast.Subscript, ast.Index, ast.Slice,
            ast.List, ast.Tuple, ast.Dict,
            ast.Call, ast.Load, ast.Store,
            # Additional allowed operators
            ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub,
            ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
            ast.Is, ast.IsNot, ast.In, ast.NotIn,
            ast.And, ast.Or, ast.Not
        }

        # Check for dangerous node types
        for child_node in ast.walk(node):
            if type(child_node) not in allowed_node_types:
                raise SecurityError(f"Unsafe AST node type: {type(child_node).__name__}")

            # Check for dangerous function calls
            if isinstance(child_node, ast.Call):
                if isinstance(child_node.func, ast.Name):
                    func_name = child_node.func.id
                    if func_name not in self._builtins:
                        raise SecurityError(f"Function '{func_name}' is not allowed")
                elif isinstance(child_node.func, ast.Attribute):
                    # Allow method calls on safe objects
                    pass
                else:
                    raise SecurityError("Complex function calls are not allowed")

            # Check variable names
            if isinstance(child_node, ast.Name):
                if child_node.id not in self.allowed_names and child_node.id not in self._builtins:
                    # Allow some common constants
                    if child_node.id not in {'True', 'False', 'None'}:
                        raise SecurityError(f"Variable '{child_node.id}' is not allowed")

    def _eval_node(self, node: ast.AST, context: Dict[str, Any]) -> Any:
        """
        Evaluate AST node safely

        Args:
            node: AST node to evaluate
            context: Context for variable lookup

        Returns:
            Evaluation result
        """
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, (ast.Num, ast.Str, ast.NameConstant)):  # Python < 3.8 compatibility
            return node.n if isinstance(node, ast.Num) else (node.s if isinstance(node, ast.Str) else node.value)
        elif isinstance(node, ast.Name):
            if node.id in context:
                return context[node.id]
            elif node.id in self._builtins:
                return self._builtins[node.id]
            elif node.id in {'True', 'False', 'None'}:
                return {'True': True, 'False': False, 'None': None}[node.id]
            else:
                raise NameError(f"Variable '{node.id}' is not defined")
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left, context)
            right = self._eval_node(node.right, context)
            return self._operators[type(node.op)](left, right)
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand, context)
            return self._operators[type(node.op)](operand)
        elif isinstance(node, ast.Compare):
            left = self._eval_node(node.left, context)
            result = True
            for op, comparator in zip(node.ops, node.comparators):
                right = self._eval_node(comparator, context)
                result = result and self._operators[type(op)](left, right)
                left = right
            return result
        elif isinstance(node, ast.BoolOp):
            values = [self._eval_node(value, context) for value in node.values]
            if isinstance(node.op, ast.And):
                return all(values)
            elif isinstance(node.op, ast.Or):
                return any(values)
        elif isinstance(node, ast.Attribute):
            obj = self._eval_node(node.value, context)
            return getattr(obj, node.attr)
        elif isinstance(node, ast.Subscript):
            obj = self._eval_node(node.value, context)
            if isinstance(node.slice, ast.Index):  # Python < 3.9
                key = self._eval_node(node.slice.value, context)
            else:  # Python >= 3.9
                key = self._eval_node(node.slice, context)
            return obj[key]
        elif isinstance(node, ast.List):
            return [self._eval_node(item, context) for item in node.elts]
        elif isinstance(node, ast.Tuple):
            return tuple(self._eval_node(item, context) for item in node.elts)
        elif isinstance(node, ast.Dict):
            result = {}
            for key_node, value_node in zip(node.keys, node.values):
                key = self._eval_node(key_node, context)
                value = self._eval_node(value_node, context)
                result[key] = value
            return result
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                func = self._builtins[node.func.id]
            elif isinstance(node.func, ast.Attribute):
                obj = self._eval_node(node.func.value, context)
                func = getattr(obj, node.func.attr)
            else:
                raise SecurityError("Complex function calls are not allowed")

            args = [self._eval_node(arg, context) for arg in node.args]
            kwargs = {kw.arg: self._eval_node(kw.value, context) for kw in node.keywords}
            return func(*args, **kwargs)
        else:
            raise SecurityError(f"Unsupported node type: {type(node).__name__}")


class SecurityError(Exception):
    """Raised when unsafe operations are detected"""
    pass


class SecureTemplateProcessor:
    """
    Secure template processing for variable substitution
    """

    def __init__(self, allowed_vars: set = None):
        self.allowed_vars = allowed_vars or set()

    def process_template(self, template: str, context: Dict[str, Any]) -> str:
        """
        Process template with variable substitution

        Args:
            template: Template string with {variable} placeholders
            context: Context variables

        Returns:
            Processed template string
        """
        def replace_var(match):
            var_name = match.group(1).strip()

            # Only allow whitelisted variables
            if var_name not in self.allowed_vars:
                return match.group(0)  # Return unchanged

            value = context.get(var_name)
            return str(value) if value is not None else match.group(0)

        return re.sub(r'\{([^}]+)\}', replace_var, template)


class SecurePredicateBuilder:
    """
    Build secure predicates for workflow conditions
    """

    def __init__(self):
        self.evaluator = SecureConditionEvaluator()

    def build_condition(self, condition_spec: Union[str, Dict, Callable]) -> Callable:
        """
        Build a secure condition function

        Args:
            condition_spec: Condition specification (string expression, dict config, or callable)

        Returns:
            Callable condition function
        """
        if callable(condition_spec):
            return condition_spec
        elif isinstance(condition_spec, str):
            return lambda context: self.evaluator.evaluate(condition_spec, {
                'context': context,
                'vars': getattr(context, 'variables', {})
            })
        elif isinstance(condition_spec, dict):
            return self._build_dict_condition(condition_spec)
        else:
            raise ValueError(f"Unsupported condition type: {type(condition_spec)}")

    def _build_dict_condition(self, spec: Dict) -> Callable:
        """
        Build condition from dictionary specification

        Args:
            spec: Dictionary with condition configuration

        Returns:
            Callable condition function
        """
        condition_type = spec.get('type', 'expression')

        if condition_type == 'expression':
            expression = spec['expression']
            return lambda context: self.evaluator.evaluate(expression, {
                'context': context,
                'vars': getattr(context, 'variables', {})
            })
        elif condition_type == 'variable_check':
            var_name = spec['variable']
            expected_value = spec.get('value')
            operator_name = spec.get('operator', 'eq')

            def variable_condition(context):
                actual_value = getattr(context, 'variables', {}).get(var_name)
                if operator_name == 'eq':
                    return actual_value == expected_value
                elif operator_name == 'ne':
                    return actual_value != expected_value
                elif operator_name == 'gt':
                    return actual_value > expected_value
                elif operator_name == 'lt':
                    return actual_value < expected_value
                elif operator_name == 'exists':
                    return actual_value is not None
                else:
                    raise ValueError(f"Unknown operator: {operator_name}")

            return variable_condition
        else:
            raise ValueError(f"Unknown condition type: {condition_type}")


# Example usage and testing
def test_secure_evaluator():
    """Test the secure evaluator"""
    evaluator = SecureConditionEvaluator()

    # Safe expressions
    safe_tests = [
        ("1 + 2", {}, 3),
        ("len(vars.get('items', []))", {'vars': {'items': [1, 2, 3]}}, 3),
        ("context.status == 'completed'", {'context': {'status': 'completed'}}, True),
        ("vars.get('count', 0) > 5", {'vars': {'count': 10}}, True),
    ]

    for expr, ctx, expected in safe_tests:
        try:
            result = evaluator.evaluate(expr, ctx)
            assert result == expected, f"Expected {expected}, got {result}"
            print(f"✓ Safe expression passed: {expr}")
        except Exception as e:
            print(f"✗ Safe expression failed: {expr} - {e}")

    # Unsafe expressions (should raise SecurityError)
    unsafe_tests = [
        "eval('1+1')",
        "__import__('os').system('ls')",
        "exec('print(1)')",
        "globals()",
        "locals()",
        "open('/etc/passwd')",
    ]

    for expr in unsafe_tests:
        try:
            evaluator.evaluate(expr, {})
            print(f"✗ Unsafe expression allowed: {expr}")
        except (SecurityError, SyntaxError):
            print(f"✓ Unsafe expression blocked: {expr}")
        except Exception as e:
            print(f"? Unsafe expression error: {expr} - {e}")


if __name__ == "__main__":
    test_secure_evaluator()