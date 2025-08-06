# Lovable Credit Monitor Extension Makefile

.PHONY: help build clean install dev

# Variables
EXTENSION_NAME = Lovable Credit Monitor Extension
BUILD_DIR = dist

# Default target
help:
	@echo "$(EXTENSION_NAME) - Available commands:"
	@echo ""
	@echo "  install  - Install npm dependencies"
	@echo "  build    - Build the extension for production"
	@echo "  dev      - Build in development mode with watch"
	@echo "  clean    - Clean build artifacts"
	@echo "  help     - Show this help message"

# Install npm dependencies
install:
	@echo "Installing npm dependencies..."
	npm install

# Build the extension for production
build:
	@echo "Building extension for production..."
	npm run build
	@echo "✓ Build complete - check $(BUILD_DIR)/ directory"

# Build in development mode with watch
dev:
	@echo "Starting development build with watch..."
	npm run dev

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)/
	@echo "✓ Clean complete" 