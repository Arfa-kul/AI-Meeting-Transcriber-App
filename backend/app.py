"""
AI Meeting Transcriber & Smart Notes Generator — Flask Application

Main entry point. Initializes database, registers blueprints, and serves the API.
"""

from flask import Flask, jsonify
from flask_cors import CORS

import config
from database import init_db
from routes.transcription_routes import transcription_bp
from routes.history_routes import history_bp
from routes.export_routes import export_bp


def create_app():
    app = Flask(__name__)
    app.secret_key = config.FLASK_SECRET_KEY
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_FILE_SIZE_BYTES

    # CORS for React dev server
    CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)

    # Initialize database
    init_db()

    # Register blueprints
    app.register_blueprint(transcription_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(export_bp)

    # Health check
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "app": "AI Meeting Transcriber",
            "version": "1.0.0",
        }), 200

    # Settings endpoint
    @app.route("/api/settings", methods=["GET"])
    def get_settings():
        return jsonify({
            "model_size": config.WHISPER_MODEL_SIZE,
            "device": config.WHISPER_DEVICE,
            "compute_type": config.WHISPER_COMPUTE_TYPE,
            "max_file_size_mb": config.MAX_FILE_SIZE_MB,
            "llm_configured": bool(config.LLM_API_KEY),
            "llm_provider": config.LLM_PROVIDER if config.LLM_API_KEY else None,
            "available_models": config.AVAILABLE_MODELS,
            "allowed_extensions": sorted(list(config.ALLOWED_EXTENSIONS)),
        }), 200

    # Error handlers
    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({
            "error": f"File is too large. Maximum size is {config.MAX_FILE_SIZE_MB} MB."
        }), 413

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error."}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    print("\n" + "=" * 60)
    print("  AI Meeting Transcriber & Smart Notes Generator")
    print("=" * 60)
    print(f"  Server:   http://{config.FLASK_HOST}:{config.FLASK_PORT}")
    print(f"  Model:    {config.WHISPER_MODEL_SIZE} ({config.WHISPER_DEVICE}/{config.WHISPER_COMPUTE_TYPE})")
    print(f"  LLM:      {'Configured (' + config.LLM_PROVIDER + ')' if config.LLM_API_KEY else 'Not configured (using extractive fallback)'}")
    print(f"  Uploads:  {config.UPLOAD_DIR}")
    print(f"  Database: {config.DATABASE_PATH}")
    print("=" * 60 + "\n")
    app.run(
        host=config.FLASK_HOST,
        port=config.FLASK_PORT,
        debug=config.FLASK_DEBUG,
        use_reloader=False,
    )
