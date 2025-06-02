from pymongo import MongoClient
from typing import Any, Dict, Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["myblog"]


def get_collection(collection_name: str):
    """
    Returns a MongoDB collection by name.
    """
    return db[collection_name]


def find_one(collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Find a single document from a collection that matches a query.
    """
    collection = get_collection(collection_name)
    return collection.find_one(query)


def find_many(collection_name: str, query: Dict[str, Any] = {}) -> List[Dict[str, Any]]:
    """
    returns a list of documents from a MongoDB collection that match a query
    """
    collection = get_collection(collection_name)
    return list(collection.find(query))


def insert_one(collection_name: str, document: Dict[str, Any]) -> str:
    """
    Insert a single document into a collection.
    Returns the inserted document ID as str.
    """
    collection = get_collection(collection_name)
    result = collection.insert_one(document)
    return str(result.inserted_id)


def update_one(collection_name: str, query: Dict[str, Any], update: Dict[str, Any]) -> int:
    """
    Update a single document matching a query.
    Returns number of documents modified.
    """
    collection = get_collection(collection_name)
    result = collection.update_one(query, {"$set": update})
    return result.modified_count


def delete_one(collection_name: str, query: Dict[str, Any]) -> int:
    """
    Delete a single document from a collection.
    Returns number of documents deleted.
    """
    collection = get_collection(collection_name)
    result = collection.delete_one(query)
    return result.deleted_count
