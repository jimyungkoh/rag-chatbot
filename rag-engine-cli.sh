#!/bin/bash

# RAG Engine Docker CLI Helper Script
# Usage: ./rag-engine-cli.sh [command] [args...]

set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Default values (can be overridden by environment variables)
CHROMA_HOST=${CHROMA_HOST:-chromadb}
CHROMA_PORT=${CHROMA_PORT:-8000}
SERVER_PORT=${SERVER_PORT:-4000}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Check if services are running
check_services() {
    if ! docker-compose -f "$COMPOSE_FILE" ps chromadb | grep -q "Up"; then
        print_warning "ChromaDB is not running. Starting services..."
        docker-compose -f "$COMPOSE_FILE" up -d chromadb
        print_info "Waiting for ChromaDB to be ready..."
        sleep 10
    fi
}

# Function to show current configuration
show_config() {
    print_info "Current Configuration:"
    echo "  CHROMA_HOST: $CHROMA_HOST"
    echo "  CHROMA_PORT: $CHROMA_PORT"
    echo "  SERVER_PORT: $SERVER_PORT"
    echo "  COMPOSE_FILE: $COMPOSE_FILE"
    echo "  CHROMA_COLLECTION: ${CHROMA_COLLECTION:-conversations}"
    echo "  EMBEDDING_MODEL_ID: ${EMBEDDING_MODEL_ID:-minishlab/potion-multilingual-128M}"
    echo ""
}

# Function to display help
show_help() {
    echo "RAG Engine Docker CLI Helper"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start                     Start all services (chromadb, server, rag-engine)"
    echo "  stop                      Stop all services"
    echo "  restart                   Restart all services"
    echo "  status                    Show service status"
    echo "  logs [service]            Show logs for all services or specific service"
    echo "  build                     Build all services"
    echo "  shell                     Open interactive shell in rag-engine container"
    echo "  config                    Show current configuration from environment"
    echo ""
    echo "RAG Engine Commands:"
    echo "  ingest [options]          Run rag-engine ingest command"
    echo "  query [options]           Run rag-engine query command"
    echo "  ingest-batch [options]    Run rag-engine ingest-batch command"
    echo ""
    echo "Examples:"
    echo "  $0 start                                    # Start all services"
    echo "  $0 ingest --msg \"Q: Hello\" --msg \"A: Hi\"     # Ingest conversation"
    echo "  $0 query --text \"Hello\" -k 3                # Search with top 3 results"
    echo "  $0 ingest-batch --from-file ./examples/chat.json"
    echo "  $0 shell                                    # Open interactive shell"
    echo ""
}

# Main command handling
case "${1:-help}" in
    "start")
        print_info "Starting all services..."
        check_docker
        docker-compose -f "$COMPOSE_FILE" up -d
        print_success "All services started successfully!"
        print_info "Services:"
        print_info "  - ChromaDB: http://localhost:$CHROMA_PORT"
        print_info "  - Server: http://localhost:$SERVER_PORT"
        print_info "  - RAG Engine: Ready for CLI commands"
        ;;
    
    "stop")
        print_info "Stopping all services..."
        docker-compose -f "$COMPOSE_FILE" down
        print_success "All services stopped!"
        ;;
    
    "restart")
        print_info "Restarting all services..."
        docker-compose -f "$COMPOSE_FILE" restart
        print_success "All services restarted!"
        ;;
    
    "status")
        print_info "Service status:"
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    
    "logs")
        service=${2:-}
        if [ -z "$service" ]; then
            print_info "Showing logs for all services:"
            docker-compose -f "$COMPOSE_FILE" logs -f
        else
            print_info "Showing logs for $service:"
            docker-compose -f "$COMPOSE_FILE" logs -f "$service"
        fi
        ;;
    
    "build")
        print_info "Building all services..."
        docker-compose -f "$COMPOSE_FILE" build
        print_success "All services built successfully!"
        ;;
    
    "config")
        show_config
        ;;
    
    "shell")
        print_info "Opening interactive shell in rag-engine container..."
        check_docker
        check_services
        docker-compose -f "$COMPOSE_FILE" run --rm rag-engine bash
        ;;
    
    "ingest")
        print_info "Running rag-engine ingest command..."
        check_docker
        check_services
        shift
        docker-compose -f "$COMPOSE_FILE" run --rm rag-engine /wait-for-it.sh "$CHROMA_HOST" "$CHROMA_PORT" -- rag-engine ingest "$@"
        ;;
    
    "query")
        print_info "Running rag-engine query command..."
        check_docker
        check_services
        shift
        docker-compose -f "$COMPOSE_FILE" run --rm rag-engine /wait-for-it.sh "$CHROMA_HOST" "$CHROMA_PORT" -- rag-engine query "$@"
        ;;
    
    "ingest-batch")
        print_info "Running rag-engine ingest-batch command..."
        check_docker
        check_services
        shift
        docker-compose -f "$COMPOSE_FILE" run --rm rag-engine /wait-for-it.sh "$CHROMA_HOST" "$CHROMA_PORT" -- rag-engine ingest-batch "$@"
        ;;
    
    "help"|"-h"|"--help")
        show_help
        ;;
    
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac