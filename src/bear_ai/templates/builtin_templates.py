"""
Built-in Conversation Templates
Pre-configured templates for common use cases
"""

import logging
from typing import List

from .template_manager import ConversationTemplate, TemplateCategory, TemplateType, TemplateVariable

logger = logging.getLogger(__name__)


class BuiltinTemplates:
    """Factory for built-in conversation templates"""
    
    @staticmethod
    def get_legal_templates() -> List[ConversationTemplate]:
        """Legal document and analysis templates"""
        
        templates = []
        
        # Contract Analysis Template
        templates.append(ConversationTemplate(
            id="legal_contract_analysis",
            name="Contract Analysis",
            description="Analyze legal contracts for key terms, risks, and recommendations",
            category=TemplateCategory.LEGAL,
            template_type=TemplateType.ANALYSIS,
            content="""Please analyze the following contract and provide:

1. **Key Terms Summary**: Identify the main parties, obligations, and terms
2. **Risk Assessment**: Highlight potential risks or concerning clauses
3. **Recommendations**: Suggest areas that may need attention or clarification
4. **Compliance Notes**: Note any regulatory or legal compliance considerations

Contract to analyze:
{contract_text}

Please provide a thorough but concise analysis focusing on practical implications.""",
            variables=[
                TemplateVariable(
                    name="contract_text",
                    description="The contract text to analyze",
                    type="text",
                    required=True,
                    placeholder="Paste the contract text here..."
                )
            ],
            system_prompt="You are a legal analyst with expertise in contract review. Provide thorough, practical analysis while noting that this is for informational purposes only and not legal advice.",
            follow_ups=[
                "Can you elaborate on the specific risks you identified?",
                "What would be the implications if this clause were modified?",
                "Are there any missing clauses that should be included?"
            ],
            generation_params={"temperature": 0.3, "max_tokens": 1500},
            tags=["legal", "contract", "analysis", "risk-assessment"],
            is_validated=True
        ))
        
        # Legal Research Template
        templates.append(ConversationTemplate(
            id="legal_research",
            name="Legal Research Assistant",
            description="Research legal precedents, statutes, and case law",
            category=TemplateCategory.LEGAL,
            template_type=TemplateType.QUERY,
            content="""I need help researching the following legal topic:

**Research Topic**: {topic}
**Jurisdiction**: {jurisdiction}
**Specific Questions**: {questions}

Please provide:
1. Relevant statutes or regulations
2. Key case precedents
3. Current legal trends or developments
4. Practical implications

Focus on {focus_area} and include citations where possible.""",
            variables=[
                TemplateVariable(
                    name="topic",
                    description="Legal topic to research",
                    type="text",
                    required=True,
                    placeholder="e.g., Data privacy compliance, Employment law, etc."
                ),
                TemplateVariable(
                    name="jurisdiction",
                    description="Relevant jurisdiction",
                    type="choice",
                    required=True,
                    choices=["Federal (US)", "California", "New York", "Texas", "European Union", "United Kingdom", "Other"],
                    default_value="Federal (US)"
                ),
                TemplateVariable(
                    name="questions",
                    description="Specific questions to research",
                    type="text",
                    required=False,
                    placeholder="Specific legal questions or areas of focus..."
                ),
                TemplateVariable(
                    name="focus_area",
                    description="Primary focus area",
                    type="choice",
                    required=False,
                    choices=["Recent developments", "Historical precedent", "Practical compliance", "Risk assessment"],
                    default_value="Recent developments"
                )
            ],
            tags=["legal", "research", "precedent", "statute"],
            is_validated=True
        ))
        
        return templates
    
    @staticmethod
    def get_business_templates() -> List[ConversationTemplate]:
        """Business and commercial templates"""
        
        templates = []
        
        # Business Plan Review
        templates.append(ConversationTemplate(
            id="business_plan_review",
            name="Business Plan Review",
            description="Comprehensive review and feedback on business plans",
            category=TemplateCategory.BUSINESS,
            template_type=TemplateType.ANALYSIS,
            content="""Please review this business plan section and provide detailed feedback:

**Section**: {section_type}
**Industry**: {industry}

**Content to Review**:
{plan_content}

Please provide:
1. **Strengths**: What works well in this section
2. **Areas for Improvement**: Specific suggestions for enhancement
3. **Missing Elements**: What should be added
4. **Market Considerations**: Industry-specific insights
5. **Implementation Tips**: Practical advice for execution

Focus on actionability and provide specific, constructive feedback.""",
            variables=[
                TemplateVariable(
                    name="section_type",
                    description="Business plan section being reviewed",
                    type="choice",
                    required=True,
                    choices=[
                        "Executive Summary",
                        "Market Analysis", 
                        "Competitive Analysis",
                        "Marketing Strategy",
                        "Operations Plan",
                        "Financial Projections",
                        "Management Team",
                        "Full Business Plan"
                    ]
                ),
                TemplateVariable(
                    name="industry",
                    description="Business industry or sector",
                    type="text",
                    required=True,
                    placeholder="e.g., Technology, Retail, Healthcare, etc."
                ),
                TemplateVariable(
                    name="plan_content",
                    description="Business plan content to review",
                    type="text",
                    required=True,
                    placeholder="Paste the business plan section here..."
                )
            ],
            system_prompt="You are an experienced business consultant specializing in business plan development and review. Provide constructive, actionable feedback.",
            tags=["business", "planning", "review", "strategy"],
            is_validated=True
        ))
        
        # Market Analysis
        templates.append(ConversationTemplate(
            id="market_analysis",
            name="Market Analysis Framework",
            description="Structured market analysis and opportunity assessment",
            category=TemplateCategory.BUSINESS,
            template_type=TemplateType.ANALYSIS,
            content="""Please conduct a market analysis for the following:

**Product/Service**: {product_service}
**Target Market**: {target_market}
**Geographic Focus**: {geographic_focus}

Please provide analysis on:

1. **Market Size & Growth**
   - Total Addressable Market (TAM)
   - Market growth trends
   - Key growth drivers

2. **Target Customer Analysis**
   - Customer segments
   - Pain points and needs
   - Buying behavior

3. **Competitive Landscape**
   - Major competitors
   - Market positioning
   - Competitive advantages

4. **Market Opportunities**
   - Underserved segments
   - Emerging trends
   - Entry strategies

5. **Risks and Challenges**
   - Market barriers
   - Regulatory concerns
   - Economic factors

Provide data-driven insights where possible and actionable recommendations.""",
            variables=[
                TemplateVariable(
                    name="product_service",
                    description="Product or service to analyze",
                    type="text",
                    required=True,
                    placeholder="Describe your product or service..."
                ),
                TemplateVariable(
                    name="target_market",
                    description="Target market or customer base",
                    type="text",
                    required=True,
                    placeholder="Who is your target customer?"
                ),
                TemplateVariable(
                    name="geographic_focus",
                    description="Geographic market focus",
                    type="text",
                    required=False,
                    placeholder="e.g., Local, National, Global",
                    default_value="National"
                )
            ],
            tags=["business", "market-analysis", "strategy", "research"],
            is_validated=True
        ))
        
        return templates
    
    @staticmethod
    def get_technical_templates() -> List[ConversationTemplate]:
        """Technical and development templates"""
        
        templates = []
        
        # Code Review Template
        templates.append(ConversationTemplate(
            id="code_review",
            name="Code Review Assistant",
            description="Comprehensive code review with best practices analysis",
            category=TemplateCategory.TECHNICAL,
            template_type=TemplateType.ANALYSIS,
            content="""Please review the following code and provide comprehensive feedback:

**Language**: {language}
**Purpose**: {code_purpose}
**Code to Review**:

```{language}
{code_content}
```

Please provide analysis on:

1. **Code Quality**
   - Readability and maintainability
   - Code structure and organization
   - Naming conventions

2. **Best Practices**
   - Language-specific best practices
   - Design patterns usage
   - Error handling

3. **Performance**
   - Potential performance issues
   - Optimization opportunities
   - Algorithmic efficiency

4. **Security**
   - Security vulnerabilities
   - Input validation
   - Data handling

5. **Recommendations**
   - Specific improvements
   - Alternative approaches
   - Next steps

Provide specific, actionable feedback with code examples where helpful.""",
            variables=[
                TemplateVariable(
                    name="language",
                    description="Programming language",
                    type="choice",
                    required=True,
                    choices=[
                        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", 
                        "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "Other"
                    ]
                ),
                TemplateVariable(
                    name="code_purpose",
                    description="What the code is intended to do",
                    type="text",
                    required=True,
                    placeholder="Brief description of the code's purpose..."
                ),
                TemplateVariable(
                    name="code_content",
                    description="Code to review",
                    type="text",
                    required=True,
                    placeholder="Paste your code here..."
                )
            ],
            system_prompt="You are a senior software engineer and code reviewer with expertise in multiple programming languages. Provide thorough, constructive feedback focused on code quality, security, and best practices.",
            generation_params={"temperature": 0.3, "max_tokens": 2000},
            tags=["technical", "code-review", "programming", "best-practices"],
            is_validated=True
        ))
        
        # Architecture Design
        templates.append(ConversationTemplate(
            id="architecture_design",
            name="System Architecture Design",
            description="Design and review system architecture with best practices",
            category=TemplateCategory.TECHNICAL,
            template_type=TemplateType.CONSULTATION,
            content="""I need help designing a system architecture for:

**Project**: {project_name}
**System Type**: {system_type}
**Scale Requirements**: {scale_requirements}
**Key Requirements**: {requirements}

Please provide:

1. **Architecture Overview**
   - High-level system design
   - Major components and their roles
   - Data flow and interactions

2. **Technology Stack Recommendations**
   - Suggested technologies and frameworks
   - Rationale for recommendations
   - Alternative options

3. **Scalability Considerations**
   - Scaling strategies
   - Performance bottlenecks
   - Load balancing approaches

4. **Security Architecture**
   - Security considerations
   - Authentication and authorization
   - Data protection strategies

5. **Implementation Approach**
   - Development phases
   - MVP considerations
   - Testing strategies

Please focus on practical, proven solutions appropriate for the scale and requirements.""",
            variables=[
                TemplateVariable(
                    name="project_name",
                    description="Project or system name",
                    type="text",
                    required=True,
                    placeholder="What are you building?"
                ),
                TemplateVariable(
                    name="system_type",
                    description="Type of system",
                    type="choice",
                    required=True,
                    choices=[
                        "Web Application",
                        "Mobile Application", 
                        "API/Microservices",
                        "Data Processing Pipeline",
                        "Real-time System",
                        "E-commerce Platform",
                        "Content Management System",
                        "Other"
                    ]
                ),
                TemplateVariable(
                    name="scale_requirements",
                    description="Expected scale and performance requirements",
                    type="text",
                    required=True,
                    placeholder="Expected users, traffic, data volume, etc."
                ),
                TemplateVariable(
                    name="requirements",
                    description="Key functional and non-functional requirements",
                    type="text",
                    required=True,
                    placeholder="List the main requirements and constraints..."
                )
            ],
            tags=["technical", "architecture", "design", "system-design"],
            is_validated=True
        ))
        
        return templates
    
    @staticmethod
    def get_creative_templates() -> List[ConversationTemplate]:
        """Creative writing and content templates"""
        
        templates = []
        
        # Creative Writing Assistant
        templates.append(ConversationTemplate(
            id="creative_writing",
            name="Creative Writing Assistant",
            description="Generate creative content with specific style and tone",
            category=TemplateCategory.CREATIVE,
            template_type=TemplateType.INSTRUCTION,
            content="""Please help me create {content_type} with the following specifications:

**Topic/Theme**: {topic}
**Style/Genre**: {style}
**Tone**: {tone}
**Target Audience**: {audience}
**Length**: {length}
**Special Requirements**: {requirements}

Key elements to include:
{key_elements}

Please create engaging, original content that matches the specified style and effectively communicates with the target audience.""",
            variables=[
                TemplateVariable(
                    name="content_type",
                    description="Type of content to create",
                    type="choice",
                    required=True,
                    choices=[
                        "Short story",
                        "Blog post",
                        "Article",
                        "Product description",
                        "Marketing copy",
                        "Script",
                        "Poem",
                        "Newsletter",
                        "Social media content"
                    ]
                ),
                TemplateVariable(
                    name="topic",
                    description="Main topic or theme",
                    type="text",
                    required=True,
                    placeholder="What should the content be about?"
                ),
                TemplateVariable(
                    name="style",
                    description="Writing style or genre",
                    type="choice",
                    required=True,
                    choices=[
                        "Professional",
                        "Casual/Conversational", 
                        "Academic",
                        "Creative/Literary",
                        "Technical",
                        "Humorous",
                        "Persuasive",
                        "Informative"
                    ]
                ),
                TemplateVariable(
                    name="tone",
                    description="Desired tone",
                    type="choice",
                    required=True,
                    choices=[
                        "Friendly",
                        "Authoritative",
                        "Enthusiastic",
                        "Serious",
                        "Playful",
                        "Inspiring",
                        "Neutral",
                        "Urgent"
                    ]
                ),
                TemplateVariable(
                    name="audience",
                    description="Target audience",
                    type="text",
                    required=True,
                    placeholder="Who is this content for?"
                ),
                TemplateVariable(
                    name="length",
                    description="Approximate length",
                    type="choice",
                    required=False,
                    choices=["Short (250-500 words)", "Medium (500-1000 words)", "Long (1000+ words)", "Specific length"],
                    default_value="Medium (500-1000 words)"
                ),
                TemplateVariable(
                    name="requirements",
                    description="Any special requirements or constraints",
                    type="text",
                    required=False,
                    placeholder="SEO keywords, specific points to cover, etc."
                ),
                TemplateVariable(
                    name="key_elements",
                    description="Key elements or points to include",
                    type="text",
                    required=False,
                    placeholder="Important points or elements to incorporate..."
                )
            ],
            system_prompt="You are a skilled creative writer and content creator with expertise in various styles and formats. Create engaging, original content tailored to the specific requirements.",
            generation_params={"temperature": 0.7, "max_tokens": 1500},
            tags=["creative", "writing", "content", "marketing"],
            is_validated=True
        ))
        
        return templates
    
    @staticmethod
    def get_analysis_templates() -> List[ConversationTemplate]:
        """Data analysis and research templates"""
        
        templates = []
        
        # Data Analysis
        templates.append(ConversationTemplate(
            id="data_analysis",
            name="Data Analysis Assistant",
            description="Analyze data sets and provide insights and recommendations",
            category=TemplateCategory.ANALYSIS,
            template_type=TemplateType.ANALYSIS,
            content="""Please analyze the following data and provide comprehensive insights:

**Data Context**: {data_context}
**Analysis Goals**: {analysis_goals}
**Data Description**: {data_description}

**Data**:
{data_content}

Please provide:

1. **Data Overview**
   - Summary statistics
   - Data quality assessment
   - Key observations

2. **Pattern Analysis**
   - Trends and patterns
   - Correlations and relationships
   - Anomalies or outliers

3. **Key Insights**
   - Most significant findings
   - Surprising discoveries
   - Business implications

4. **Visualizations Recommendations**
   - Suggested chart types
   - Key metrics to highlight
   - Dashboard components

5. **Recommendations**
   - Actionable next steps
   - Areas for further investigation
   - Strategic recommendations

Focus on practical insights that can drive decision-making.""",
            variables=[
                TemplateVariable(
                    name="data_context",
                    description="Context and background of the data",
                    type="text",
                    required=True,
                    placeholder="What is this data about? Where did it come from?"
                ),
                TemplateVariable(
                    name="analysis_goals",
                    description="What you want to learn from the analysis",
                    type="text",
                    required=True,
                    placeholder="What questions are you trying to answer?"
                ),
                TemplateVariable(
                    name="data_description",
                    description="Description of data format and structure",
                    type="text",
                    required=True,
                    placeholder="Describe the columns, format, time period, etc."
                ),
                TemplateVariable(
                    name="data_content",
                    description="The actual data to analyze",
                    type="text",
                    required=True,
                    placeholder="Paste your data here (CSV, table format, etc.)"
                )
            ],
            system_prompt="You are a data analyst with expertise in statistical analysis, pattern recognition, and business intelligence. Provide thorough, actionable insights from data analysis.",
            tags=["analysis", "data", "statistics", "insights"],
            is_validated=True
        ))
        
        return templates
    
    @staticmethod
    def get_educational_templates() -> List[ConversationTemplate]:
        """Educational and learning templates"""
        
        templates = []
        
        # Concept Explanation
        templates.append(ConversationTemplate(
            id="concept_explanation",
            name="Concept Explanation Tutor",
            description="Explain complex concepts with examples and analogies",
            category=TemplateCategory.EDUCATIONAL,
            template_type=TemplateType.INSTRUCTION,
            content="""Please explain the concept of "{concept}" to someone with {knowledge_level} background.

**Learning Context**: {context}
**Specific Focus**: {focus_areas}

Please provide:

1. **Simple Definition**
   - Clear, jargon-free explanation
   - Key components or aspects

2. **Real-World Examples**
   - Concrete examples they can relate to
   - Multiple scenarios showing different applications

3. **Analogies and Metaphors**
   - Helpful comparisons to familiar concepts
   - Visual or conceptual metaphors

4. **Step-by-Step Breakdown**
   - How it works or happens
   - Logical sequence or process

5. **Common Misconceptions**
   - What people often get wrong
   - Clarification of confusing aspects

6. **Practice Questions**
   - Questions to test understanding
   - Scenarios to think about

Make it engaging and build understanding progressively from basics to more complex aspects.""",
            variables=[
                TemplateVariable(
                    name="concept",
                    description="Concept to explain",
                    type="text",
                    required=True,
                    placeholder="What concept needs explanation?"
                ),
                TemplateVariable(
                    name="knowledge_level",
                    description="Learner's background knowledge",
                    type="choice",
                    required=True,
                    choices=[
                        "Complete beginner",
                        "Some basic knowledge",
                        "Intermediate understanding",
                        "Advanced but new to this area"
                    ]
                ),
                TemplateVariable(
                    name="context",
                    description="Learning context or application area",
                    type="text",
                    required=False,
                    placeholder="Academic course, professional development, personal interest, etc."
                ),
                TemplateVariable(
                    name="focus_areas",
                    description="Specific aspects to emphasize",
                    type="text",
                    required=False,
                    placeholder="Particular aspects or applications to focus on..."
                )
            ],
            system_prompt="You are an expert educator skilled at explaining complex concepts clearly and engagingly. Use appropriate analogies, examples, and progressive learning techniques.",
            tags=["educational", "explanation", "learning", "teaching"],
            is_validated=True
        ))
        
        return templates


def get_builtin_templates() -> List[ConversationTemplate]:
    """Get all built-in templates"""
    
    all_templates = []
    
    # Add templates from each category
    all_templates.extend(BuiltinTemplates.get_legal_templates())
    all_templates.extend(BuiltinTemplates.get_business_templates())
    all_templates.extend(BuiltinTemplates.get_technical_templates())
    all_templates.extend(BuiltinTemplates.get_creative_templates())
    all_templates.extend(BuiltinTemplates.get_analysis_templates())
    all_templates.extend(BuiltinTemplates.get_educational_templates())
    
    logger.info(f"Generated {len(all_templates)} built-in templates")
    return all_templates


def register_builtin_templates():
    """Register all built-in templates with the template manager"""
    
    from .template_manager import get_template_manager
    
    manager = get_template_manager()
    templates = get_builtin_templates()
    
    for template in templates:
        template.is_builtin = True
        manager.templates[template.id] = template
        manager._update_category_index(template)
    
    logger.info(f"Registered {len(templates)} built-in templates")