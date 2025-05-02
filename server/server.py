from flask import Flask, request
from flask_socketio import SocketIO, join_room, emit
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Switch to threading mode which is more compatible with Python 3.13
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# In-memory storage for user connections and room data
email_to_sid = {}
sid_to_email = {}
room_passwords = {}  # Store room passwords

@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in sid_to_email:
        email = sid_to_email[request.sid]
        del sid_to_email[request.sid]
        if email in email_to_sid:
            del email_to_sid[email]
        logger.info(f"Client disconnected: {request.sid}, email: {email}")
    else:
        logger.info(f"Client disconnected: {request.sid}")

@socketio.on('join-room')
def handle_join_room(data):
    room = data.get('room')
    email = data.get('email')
    password = data.get('password')  # Optional password for validation
    
    # Store user connection
    email_to_sid[email] = request.sid
    sid_to_email[request.sid] = email
    
    # Only validate password if provided (for compatibility with existing clients)
    if password and room in room_passwords and password != room_passwords[room]:
        emit('room:error', {'message': 'Invalid password'}, room=request.sid)
        return
    
    join_room(room)
    emit('user:joined', {'email': email, 'id': request.sid}, room=room, include_self=False)
    emit('join-room', {'room': room, 'email': email}, room=request.sid)
    
    # Send room password to all users in the room for window.__ROOM_STORE__ synchronization
    if room in room_passwords:
        emit('room:password:sync', {'room': room, 'password': room_passwords[room]}, room=request.sid)

@socketio.on('create-room')
def handle_create_room(data):
    room = data.get('room')
    password = data.get('password')
    
    # Store room password (for production use a proper database)
    if room and password:
        room_passwords[room] = password
        
        # Join the room creator to the room
        join_room(room)
        emit('room:created', {'room': room, 'success': True}, room=request.sid)
    else:
        emit('room:created', {'room': room, 'success': False, 'message': 'Missing room ID or password'}, room=request.sid)

@socketio.on('verify-room')
def handle_verify_room(data):
    room = data.get('room')
    password = data.get('password')
    
    # Verify room password
    if room in room_passwords and room_passwords[room] == password:
        emit('room:verified', {'room': room, 'success': True}, room=request.sid)
    else:
        emit('room:verified', {'room': room, 'success': False}, room=request.sid)

@socketio.on('get-room-password')
def handle_get_room_password(data):
    room = data.get('room')
    if room in room_passwords:
        emit('room:password', {'room': room, 'password': room_passwords[room]}, room=request.sid)
    else:
        emit('room:password', {'room': room, 'exists': False}, room=request.sid)

@socketio.on('user:call')
def handle_user_call(data):
    to = data.get('to')
    offer = data.get('offer')
    emit('incoming:call', {'from': request.sid, 'offer': offer}, room=to)

@socketio.on('call:accepted')
def handle_call_accepted(data):
    to = data.get('to')
    ans = data.get('ans')
    emit('call:accepted', {'from': request.sid, 'ans': ans}, room=to)

@socketio.on('peer:nego:needed')
def handle_peer_nego_needed(data):
    offer = data.get('offer')
    to = data.get('to')
    emit('peer:nego:needed', {'offer': offer, 'from': request.sid}, room=to)

@socketio.on('peer:nego:done')
def handle_peer_nego_done(data):
    to = data.get('to')
    ans = data.get('ans')
    emit('peer:nego:final', {'from': request.sid, 'ans': ans}, room=to)

if __name__ == '__main__':
    try:
        logger.info("Starting Flask-SocketIO server on port 8000...")
        # Use the werkzeug server which is more compatible with Python 3.13
        socketio.run(app, host='0.0.0.0', port=8000, debug=True, allow_unsafe_werkzeug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
