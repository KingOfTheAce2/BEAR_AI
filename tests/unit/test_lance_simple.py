#!/usr/bin/env python3
"""
Simple LanceDB Vector Store Test
Tests basic functionality without complex imports
"""

import sys
import os
import tempfile
import shutil
import json
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

try:
    # Direct import of vector_store module
    from bear_ai.rag.vector_store import LanceVectorStore, EmbeddingModel, get_vector_store
    LANCE_AVAILABLE = True
except ImportError as e:
    print(f"LanceDB not available: {e}")
    LANCE_AVAILABLE = False


async def test_lance_basic():
    """Test basic LanceDB functionality"""
    if not LANCE_AVAILABLE:
        print("❌ Skipping tests - LanceDB dependencies not available")
        print("📦 Install with: pip install lancedb pyarrow pandas")
        return False
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    print(f"📁 Using temp directory: {temp_dir}")
    
    try:
        print("🚀 Testing LanceDB Vector Store...")
        
        # Test 1: Initialization
        print("\n1️⃣ Testing initialization...")
        store = LanceVectorStore(persist_directory=temp_dir)
        print("✅ LanceVectorStore initialized successfully")
        
        # Test 2: Add vectors
        print("\n2️⃣ Testing vector addition...")
        ids = ["doc1", "doc2", "doc3"]
        embeddings = [
            [0.1, 0.2, 0.3, 0.4],
            [0.2, 0.3, 0.4, 0.5], 
            [0.3, 0.4, 0.5, 0.6]
        ]
        contents = [
            "First document about AI",
            "Second document about ML",
            "Third document about vectors"
        ]
        metadata = [
            {"source": "doc1.txt", "type": "text"},
            {"source": "doc2.txt", "type": "text"},
            {"source": "doc3.txt", "type": "text"}
        ]
        
        success = await store.add_vectors(ids, embeddings, contents, metadata)
        if success:
            print("✅ Vectors added successfully")
        else:
            print("❌ Failed to add vectors")
            return False
        
        # Test 3: Search vectors
        print("\n3️⃣ Testing vector search...")
        query_embedding = [0.1, 0.2, 0.3, 0.4]
        results = await store.search(query_embedding, limit=2)
        
        if results:
            print(f"✅ Found {len(results)} search results")
            for i, result in enumerate(results):
                print(f"   Result {i+1}: {result.id} (score: {result.score:.3f})")
        else:
            print("❌ No search results found")
            return False
        
        # Test 4: Get specific vector
        print("\n4️⃣ Testing get vector...")
        result = await store.get_vector("doc1")
        if result:
            print(f"✅ Retrieved vector: {result.id} - {result.content}")
        else:
            print("❌ Failed to retrieve vector")
            return False
        
        # Test 5: List vectors
        print("\n5️⃣ Testing list vectors...")
        all_vectors = await store.list_vectors()
        if all_vectors:
            print(f"✅ Listed {len(all_vectors)} vectors")
        else:
            print("❌ Failed to list vectors")
            return False
        
        # Test 6: Get statistics
        print("\n6️⃣ Testing statistics...")
        stats = store.get_stats()
        if stats:
            print("✅ Statistics retrieved:")
            for key, value in stats.items():
                print(f"   {key}: {value}")
        else:
            print("❌ Failed to get statistics")
            return False
        
        # Test 7: Delete vectors
        print("\n7️⃣ Testing vector deletion...")
        delete_success = await store.delete_vectors(["doc2"])
        if delete_success:
            print("✅ Vector deleted successfully")
            
            # Verify deletion
            deleted_result = await store.get_vector("doc2")
            if deleted_result is None:
                print("✅ Deletion verified")
            else:
                print("❌ Vector not properly deleted")
                return False
        else:
            print("❌ Failed to delete vector")
            return False
        
        print("\n🎉 All tests passed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
        
    finally:
        # Clean up
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        print(f"🧹 Cleaned up temp directory")


def test_embedding_model():
    """Test embedding model functionality"""
    print("\n🤖 Testing Embedding Model...")
    
    try:
        model = EmbeddingModel()
        
        # Test single encoding
        single_embedding = model.encode("Test document")
        print(f"✅ Single embedding: {len(single_embedding)} dimensions")
        
        # Test batch encoding
        batch_embeddings = model.encode(["Doc 1", "Doc 2"])
        print(f"✅ Batch embeddings: {len(batch_embeddings)} vectors")
        
        return True
    except Exception as e:
        print(f"❌ Embedding model test failed: {e}")
        return False


def test_factory_function():
    """Test the factory function"""
    if not LANCE_AVAILABLE:
        print("❌ Skipping factory test - LanceDB not available")
        return False
        
    print("\n🏭 Testing Factory Function...")
    
    temp_dir = tempfile.mkdtemp()
    try:
        store = get_vector_store(store_type="lance", persist_directory=temp_dir)
        if isinstance(store, LanceVectorStore):
            print("✅ Factory function works correctly")
            return True
        else:
            print("❌ Factory function returned wrong type")
            return False
    except Exception as e:
        print(f"❌ Factory function failed: {e}")
        return False
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


async def main():
    """Run all tests"""
    print("🧪 Running LanceDB Integration Tests\n")
    
    results = []
    
    # Run async tests
    results.append(await test_lance_basic())
    
    # Run sync tests  
    results.append(test_embedding_model())
    results.append(test_factory_function())
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"\n📊 Test Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! LanceDB integration is working correctly.")
        return True
    else:
        print("❌ Some tests failed. Check the output above for details.")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)