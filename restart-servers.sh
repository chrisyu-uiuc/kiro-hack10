#!/bin/bash

echo "🔄 Restarting Travel Itinerary Generator Servers..."

# Kill all processes on ports 3000 and 3001
echo "🛑 Killing processes on ports 3000 and 3001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No processes found on port 3000"
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No processes found on port 3001"

# Wait a moment for processes to fully terminate
sleep 2

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

# Start backend server
echo "🚀 Starting backend server..."
node dist/server.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Test backend health
echo "🏥 Testing backend health..."
curl -s http://localhost:3001/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend server
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

echo "🎉 Servers started successfully!"
echo "📍 Backend: http://localhost:3001 (Network: http://192.168.8.62:3001)"
echo "📍 Frontend: http://localhost:3000 (Network: http://192.168.8.62:3000)"
echo ""
echo "🔍 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers, run: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "✨ Enhanced itinerary generation with realistic timing is ready!"