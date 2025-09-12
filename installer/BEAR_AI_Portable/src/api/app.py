"""
Court Cases Search API Service
A Flask-based REST API for searching court cases with proper documentation.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import os
import json

from models.case_model import CourtCase, CaseDatabase
from utils.validators import SearchValidator
from utils.logger import setup_logging

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Enable CORS for frontend integration
CORS(app, origins=["http://localhost:3000", "http://localhost:8080"])

# Rate limiting
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Setup logging
logger = setup_logging()

# Initialize database
db = CaseDatabase()

# Middleware for request logging
@app.before_request
def log_request_info():
    """Log incoming requests for monitoring"""
    logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")
    request.start_time = time.time()

@app.after_request
def log_response_info(response):
    """Log response information"""
    duration = time.time() - request.start_time
    logger.info(f"Response: {response.status_code} in {duration:.3f}s")
    response.headers['X-Response-Time'] = f"{duration:.3f}s"
    return response

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    """Handle bad request errors"""
    return jsonify({
        "error": "Bad Request",
        "message": str(error.description),
        "status_code": 400
    }), 400

@app.errorhandler(404)
def not_found(error):
    """Handle not found errors"""
    return jsonify({
        "error": "Not Found",
        "message": "The requested resource was not found",
        "status_code": 404
    }), 404

@app.errorhandler(429)
def rate_limit_handler(e):
    """Handle rate limit exceeded"""
    return jsonify({
        "error": "Rate Limit Exceeded",
        "message": "Too many requests. Please try again later.",
        "status_code": 429
    }), 429

@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors"""
    logger.error(f"Internal error: {str(error)}")
    return jsonify({
        "error": "Internal Server Error",
        "message": "An internal error occurred",
        "status_code": 500
    }), 500

# Routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "database_status": "connected" if db.is_connected() else "disconnected"
    })

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    stats = db.get_statistics()
    return jsonify({
        "total_cases": stats["total_cases"],
        "courts": stats["courts"],
        "date_range": stats["date_range"],
        "last_updated": stats["last_updated"],
        "api_version": "1.0.0"
    })

@app.route('/cases/search', methods=['GET'])
@limiter.limit("30 per minute")
def search_cases():
    """
    Search court cases with various filters
    
    Query Parameters:
    - q: Search query (string)
    - court: Court name filter (string)
    - date_from: Start date filter (YYYY-MM-DD)
    - date_to: End date filter (YYYY-MM-DD)
    - limit: Number of results per page (integer, max 100)
    - offset: Number of results to skip (integer)
    """
    start_time = time.time()
    
    try:
        # Get and validate query parameters
        query = request.args.get('q', '').strip()
        court = request.args.get('court', '').strip()
        date_from = request.args.get('date_from', '').strip()
        date_to = request.args.get('date_to', '').strip()
        limit = request.args.get('limit', '10')
        offset = request.args.get('offset', '0')
        
        # Validate parameters
        validator = SearchValidator()
        validation_result = validator.validate_search_params(
            query=query,
            court=court,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset
        )
        
        if not validation_result["valid"]:
            return jsonify({
                "error": "Validation Error",
                "message": validation_result["message"],
                "status_code": 400
            }), 400
        
        # Convert limit and offset to integers
        limit = int(limit)
        offset = int(offset)
        
        # Perform search
        search_results = db.search_cases(
            query=query,
            court=court,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset
        )
        
        # Calculate pagination
        total = search_results["total"]
        page = (offset // limit) + 1
        
        # Measure query time
        query_time = (time.time() - start_time) * 1000
        
        return jsonify({
            "results": search_results["cases"],
            "total": total,
            "page": page,
            "per_page": limit,
            "query_time_ms": round(query_time, 1)
        })
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({
            "error": "Search Error",
            "message": "An error occurred while searching cases",
            "status_code": 500
        }), 500

@app.route('/cases/<string:ecli>', methods=['GET'])
@limiter.limit("60 per minute")
def get_case_details(ecli: str):
    """
    Get detailed information for a specific case by ECLI
    
    Path Parameters:
    - ecli: European Case Law Identifier (string)
    """
    try:
        # Validate ECLI format
        validator = SearchValidator()
        if not validator.validate_ecli(ecli):
            return jsonify({
                "error": "Invalid ECLI",
                "message": "The provided ECLI format is invalid",
                "status_code": 400
            }), 400
        
        # Get case details
        case = db.get_case_by_ecli(ecli)
        
        if not case:
            return jsonify({
                "error": "Case Not Found",
                "message": f"No case found with ECLI: {ecli}",
                "status_code": 404
            }), 404
        
        return jsonify(case)
        
    except Exception as e:
        logger.error(f"Case retrieval error: {str(e)}")
        return jsonify({
            "error": "Retrieval Error",
            "message": "An error occurred while retrieving the case",
            "status_code": 500
        }), 500

# API Documentation endpoint
@app.route('/api/docs', methods=['GET'])
def api_documentation():
    """Get OpenAPI documentation"""
    return jsonify({
        "openapi": "3.0.0",
        "info": {
            "title": "Court Cases Search API",
            "version": "1.0.0",
            "description": "A REST API for searching and retrieving court case information"
        },
        "servers": [
            {"url": "http://localhost:5000", "description": "Development server"}
        ],
        "paths": {
            "/health": {
                "get": {
                    "summary": "Health check",
                    "responses": {
                        "200": {
                            "description": "Service is healthy",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "status": {"type": "string"},
                                            "timestamp": {"type": "string"},
                                            "version": {"type": "string"},
                                            "database_status": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/cases/search": {
                "get": {
                    "summary": "Search court cases",
                    "parameters": [
                        {
                            "name": "q",
                            "in": "query",
                            "description": "Search query",
                            "schema": {"type": "string"}
                        },
                        {
                            "name": "court",
                            "in": "query",
                            "description": "Court name filter",
                            "schema": {"type": "string"}
                        },
                        {
                            "name": "date_from",
                            "in": "query",
                            "description": "Start date (YYYY-MM-DD)",
                            "schema": {"type": "string", "format": "date"}
                        },
                        {
                            "name": "date_to",
                            "in": "query",
                            "description": "End date (YYYY-MM-DD)",
                            "schema": {"type": "string", "format": "date"}
                        },
                        {
                            "name": "limit",
                            "in": "query",
                            "description": "Results per page (max 100)",
                            "schema": {"type": "integer", "minimum": 1, "maximum": 100}
                        },
                        {
                            "name": "offset",
                            "in": "query",
                            "description": "Number of results to skip",
                            "schema": {"type": "integer", "minimum": 0}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Search results",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "results": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/CourtCase"}
                                            },
                                            "total": {"type": "integer"},
                                            "page": {"type": "integer"},
                                            "per_page": {"type": "integer"},
                                            "query_time_ms": {"type": "number"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "schemas": {
                "CourtCase": {
                    "type": "object",
                    "properties": {
                        "ecli": {"type": "string"},
                        "date": {"type": "string", "format": "date"},
                        "court": {"type": "string"},
                        "keywords": {"type": "array", "items": {"type": "string"}},
                        "summary": {"type": "string"},
                        "excerpt": {"type": "string"},
                        "relevance_score": {"type": "number", "minimum": 0, "maximum": 1}
                    }
                }
            }
        }
    })

if __name__ == '__main__':
    # Load sample data on startup
    db.load_sample_data()
    
    # Run the application
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Court Cases Search API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)