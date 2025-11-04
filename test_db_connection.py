"""
Quick test script to verify FastAPI is properly connected to Better Auth database
Run this BEFORE starting your face recognition API
"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

print("🔍 Testing Database Connection...\n")

# Get connection details
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "test")

print(f"📡 MongoDB URI: {MONGO_URI}")
print(f"🗄️  Database Name: {MONGO_DB_NAME}\n")

try:
    # Connect
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    users_collection = db["user"]  # Singular - Better Auth collection
    
    print("✅ Connected to MongoDB successfully!\n")
    
    # Test 1: Check if collection exists
    collections = db.list_collection_names()
    print(f"📋 Available collections: {collections}\n")
    
    if "user" not in collections:
        print("❌ ERROR: 'user' collection not found!")
        print("   Better Auth should create this collection.")
        print("   Make sure you've logged in at least once in your app.\n")
        exit(1)
    
    print("✅ 'user' collection found!\n")
    
    # Test 2: Count users
    total_users = users_collection.count_documents({})
    print(f"👥 Total users in database: {total_users}")
    
    if total_users == 0:
        print("⚠️  WARNING: No users found!")
        print("   Create at least one user by signing up in your app first.\n")
    
    # Test 3: Show sample user
    sample_user = users_collection.find_one({}, {"email": 1, "name": 1, "faceRegistered": 1, "_id": 0})
    if sample_user:
        print(f"\n📄 Sample user:")
        print(f"   Email: {sample_user.get('email')}")
        print(f"   Name: {sample_user.get('name')}")
        print(f"   Face Registered: {sample_user.get('faceRegistered', False)}")
    
    # Test 4: Check face registrations
    face_registered_count = users_collection.count_documents({"faceRegistered": True})
    print(f"\n😊 Users with face registered: {face_registered_count}\n")
    
    print("=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nYour FastAPI is ready to connect to this database.")
    print(f"\nMake sure your FastAPI .env has:")
    print(f"MONGO_URI={MONGO_URI}")
    print(f"MONGO_DB_NAME={MONGO_DB_NAME}")
    print("\nNow you can start your FastAPI server! 🚀\n")
    
except Exception as e:
    print(f"❌ ERROR: {str(e)}\n")
    print("Troubleshooting:")
    print("1. Check MONGO_URI in .env file")
    print("2. Make sure MongoDB is running")
    print("3. Verify database name matches your Next.js app")
    exit(1)
