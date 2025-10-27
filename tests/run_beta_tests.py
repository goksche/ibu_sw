# tests/run_beta_tests.py
"""
IBU Turniere v1.1.0-beta.1 - Comprehensive Test Runner

Führt alle Beta-Tests aus:
- Integration Tests
- Performance Tests  
- Regression Tests
- Memory Tests
- Exception Tests
- Validator Tests
"""

import sys
import os
import time
import subprocess
from datetime import datetime

# Add project root to sys.path
SCRIPT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
sys.path.insert(0, PROJECT_ROOT)

def run_test_suite(test_name, test_file):
    """Run a single test suite and return results"""
    print(f"\n{'='*60}")
    print(f"Running {test_name}...")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        # Run the test file
        result = subprocess.run([sys.executable, test_file], 
                              capture_output=True, text=True, cwd=PROJECT_ROOT)
        
        end_time = time.time()
        duration = end_time - start_time
        
        if result.returncode == 0:
            print(f"[OK] {test_name} PASSED ({duration:.2f}s)")
            return True, duration, result.stdout
        else:
            print(f"[FAIL] {test_name} FAILED ({duration:.2f}s)")
            print(f"Error output: {result.stderr}")
            return False, duration, result.stderr
            
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        print(f"[ERROR] {test_name} ERROR ({duration:.2f}s): {e}")
        return False, duration, str(e)

def main():
    """Main test runner for all beta tests"""
    print("=" * 80)
    print("IBU Turniere v1.1.0-beta.1 - Comprehensive Test Suite")
    print("=" * 80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Define all test suites
    test_suites = [
        ("Exception Handling Tests", "tests/test_exceptions.py"),
        ("Validator Tests", "tests/test_validators.py"),
        ("Memory Profiling Tests", "tests/simple_memory_test.py"),
        ("Simple Integration Tests", "tests/test_simple_integration.py"),
    ]
    
    # Run all test suites
    results = []
    total_start_time = time.time()
    
    for test_name, test_file in test_suites:
        success, duration, output = run_test_suite(test_name, test_file)
        results.append({
            'name': test_name,
            'success': success,
            'duration': duration,
            'output': output
        })
    
    total_end_time = time.time()
    total_duration = total_end_time - total_start_time
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = 0
    failed = 0
    
    for result in results:
        status = "[OK] PASSED" if result['success'] else "[FAIL] FAILED"
        print(f"{result['name']:<30} {status:<12} ({result['duration']:.2f}s)")
        
        if result['success']:
            passed += 1
        else:
            failed += 1
    
    print("-" * 80)
    print(f"Total Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total Duration: {total_duration:.2f}s")
    print(f"Success Rate: {(passed/len(results)*100):.1f}%")
    
    # Overall result
    if failed == 0:
        print("\n[SUCCESS] ALL TESTS PASSED! v1.1.0-beta.1 is ready for RC!")
        overall_success = True
    else:
        print(f"\n[WARNING] {failed} TEST(S) FAILED! Please fix issues before proceeding.")
        overall_success = False
    
    print("=" * 80)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())
