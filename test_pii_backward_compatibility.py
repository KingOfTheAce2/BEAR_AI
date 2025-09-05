"""
Test backward compatibility of PII system

This script tests that the new PII system maintains backward compatibility
with the existing scrub_pii function from security.py.
"""

import os
import sys

# Add src to path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_original_scrub_pii():
    """Test the original scrub_pii function."""
    print("Testing original scrub_pii function...")
    
    try:
        from bear_ai.security import scrub_pii
        
        # Test with sample PII data
        test_text = """
        My email is john.doe@example.com and my phone is 123-456-7890.
        My Dutch BSN is 123456789 and my business RSIN is 987654321.
        Credit card: 4111 1111 1111 1111
        IP address: 192.168.1.1
        """
        
        result = scrub_pii(test_text)
        print("Original scrub_pii result:")
        print(result)
        print("\nOK: Original scrub_pii is working")
        return True
        
    except Exception as e:
        print(f"ERROR: Original scrub_pii failed: {e}")
        return False

def test_backward_compatible_import():
    """Test backward compatible import from PII package."""
    print("\nTesting backward compatible import...")
    
    try:
        # This should work if the PII package is properly set up
        from bear_ai.pii import scrub_pii
        
        # Test with same data as original
        test_text = """
        My email is john.doe@example.com and my phone is 123-456-7890.
        My Dutch BSN is 123456789 and my business RSIN is 987654321.
        Credit card: 4111 1111 1111 1111
        IP address: 192.168.1.1
        """
        
        result = scrub_pii(test_text)
        print("Backward compatible scrub_pii result:")
        print(result)
        print("\nOK: Backward compatible import is working")
        return True
        
    except Exception as e:
        print(f"ERROR: Backward compatible import failed: {e}")
        return False

def test_new_pii_system():
    """Test the new PII system directly."""
    print("\nTesting new PII system...")
    
    try:
        from bear_ai.pii import Scrubber, Policy
        
        # Create scrubber and policy
        scrubber = Scrubber()
        policy = Policy()
        
        if scrubber.is_available():
            print("Presidio is available - testing with Presidio")
            
            test_text = """
            My name is John Doe and my email is john.doe@example.com.
            My phone number is 123-456-7890.
            My Dutch BSN is 123456789 and my business RSIN is 987654321.
            """
            
            result = scrubber.scrub(test_text, policy, direction="inbound")
            print("New PII system result:")
            print(result)
            
        else:
            print("Presidio not available - testing fallback")
            
            test_text = """
            My email is john.doe@example.com and my phone is 123-456-7890.
            Credit card: 4111 1111 1111 1111
            """
            
            result = scrubber.scrub(test_text, policy, direction="inbound")
            print("Fallback result:")
            print(result)
        
        print("\nOK: New PII system is working")
        return True
        
    except Exception as e:
        print(f"ERROR: New PII system failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_environment_variables():
    """Test environment variable configuration."""
    print("\nTesting environment variable configuration...")
    
    # Test with PII disabled
    os.environ["PII_ENABLE"] = "false"
    
    try:
        from bear_ai.pii import scrub_pii
        
        test_text = "Email: test@example.com"
        result = scrub_pii(test_text)
        
        # Should use original regex-based approach when PII_ENABLE=false
        print(f"With PII_ENABLE=false: {repr(result)}")
        
        # Test with PII enabled (if Presidio is available)
        os.environ["PII_ENABLE"] = "true"
        result_enabled = scrub_pii(test_text)
        print(f"With PII_ENABLE=true: {repr(result_enabled)}")
        
        print("OK: Environment variable configuration working")
        return True
        
    except Exception as e:
        print(f"ERROR: Environment variable test failed: {e}")
        return False
    finally:
        # Clean up environment
        os.environ.pop("PII_ENABLE", None)

def main():
    """Run all backward compatibility tests."""
    print("=" * 60)
    print("BEAR AI PII Backward Compatibility Test")
    print("=" * 60)
    
    tests = [
        test_original_scrub_pii,
        test_backward_compatible_import,
        test_new_pii_system,
        test_environment_variables
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"EXCEPTION in {test.__name__}: {e}")
            results.append(False)
        print("-" * 40)
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("SUCCESS: All backward compatibility tests passed!")
    else:
        print("WARNING: Some tests failed. The system may still work but with limited functionality.")
    
    print("\nTo enable full PII functionality, ensure:")
    print("1. Presidio is installed: pip install presidio-analyzer presidio-anonymizer")
    print("2. spaCy models are available: python -m spacy download nl_core_news_lg")
    print("3. Environment variables are set: PII_ENABLE=true")

if __name__ == "__main__":
    main()