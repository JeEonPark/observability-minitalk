#!/usr/bin/env python3
"""
New Year Chat Load Test Script
Generates massive amount of users, chatrooms, and New Year celebration messages
"""

import asyncio
import random
import time
import json
import threading
import uuid
from datetime import datetime
from typing import List, Dict
import requests
import socketio
from colorama import init, Fore, Style
from fake_useragent import UserAgent
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize colorama for colored output
init()

# Configuration - Use IP address to avoid DNS issues
BASE_URL = "http://127.0.0.1:4000"
SOCKET_URL = "http://127.0.0.1:4000"

# New Year celebration messages in English
NEW_YEAR_MESSAGES = [
    "🎉 Happy New Year everyone! 🎉",
    "🎊 Wishing you all a fantastic 2024! 🎊",
    "🥳 Cheers to new beginnings!",
    "✨ May this year be filled with joy and success! ✨",
    "🎆 Happy New Year! Let's make it amazing! 🎆",
    "🍾 Pop the champagne! New Year is here! 🍾",
    "🎈 Here's to 365 new days of opportunities!",
    "🌟 New Year, new dreams, new hopes! 🌟",
    "🎯 Ready to conquer 2024!",
    "💫 Sparkling into the New Year!",
    "🎪 Let the celebrations begin!",
    "🎭 New Year, new adventures ahead!",
    "🚀 Blasting off into 2024!",
    "🌈 Rainbow of possibilities this year!",
    "🎨 Painting a beautiful New Year!",
    "🎵 Dancing into the New Year!",
    "🎸 Rocking the New Year celebration!",
    "🎺 Trumpeting in the New Year!",
    "🎹 Playing the melody of new beginnings!",
    "🎤 Singing Happy New Year to all!",
    "🎬 Action! New Year scene begins!",
    "📸 Capturing this magical New Year moment!",
    "🎪 The greatest New Year show on earth!",
    "🎠 Merry-go-round of New Year joy!",
    "🎡 Ferris wheel of New Year excitement!",
    "🎢 Roller coaster of New Year thrills!",
    "🎳 Strike! Perfect New Year celebration!",
    "🎯 Bullseye! Hitting all New Year goals!",
    "🏆 Champion of New Year celebrations!",
    "🥇 Gold medal New Year wishes!",
    "🎖️ Medal of honor for this New Year!",
    "🏅 Victory lap into the New Year!",
    "🎪 Three rings of New Year circus!",
    "🎭 Comedy and drama of New Year!",
    "🎨 Masterpiece of a New Year!",
    "🖼️ Framing this perfect New Year!",
    "🎪 Spectacular New Year extravaganza!",
    "🎊 Confetti explosion for New Year!",
    "🎉 Party time! New Year is here!",
    "🥳 Celebration mode: ON for New Year!"
]

# Chatroom names for New Year theme
CHATROOM_NAMES = [
    "🎉 New Year Central 🎉",
    "🎊 Midnight Countdown 🎊",
    "🥳 Resolution Squad 🥳",
    "✨ Sparkle & Shine ✨",
    "🎆 Fireworks Gallery 🎆",
    "🍾 Champagne Corner 🍾",
    "🎈 Party Palace 🎈",
    "🌟 Starry Wishes 🌟",
    "🎯 Goals & Dreams 🎯",
    "💫 Magic Moments 💫",
    "🎪 Celebration Circus 🎪",
    "🎭 New Year Theater 🎭",
    "🚀 Launch Pad 2024 🚀",
    "🌈 Rainbow Resolutions 🌈",
    "🎨 Creative New Year 🎨"
]

class NewYearLoadTest:
    def __init__(self):
        self.users = []
        self.chatrooms = []
        self.sockets = []
        self.ua = UserAgent()
        
        # Check system limits
        self.check_system_limits()
    
    def check_system_limits(self):
        """Check system file descriptor limits"""
        try:
            import resource
            soft_limit, hard_limit = resource.getrlimit(resource.RLIMIT_NOFILE)
            self.print_colored(f"🔧 System file descriptor limits: soft={soft_limit}, hard={hard_limit}", Fore.CYAN)
            
            if soft_limit < 1000:
                self.print_colored(f"⚠️ WARNING: Low file descriptor limit ({soft_limit}). Consider increasing with 'ulimit -n 4096'", Fore.YELLOW)
            
            # Try to increase soft limit if possible
            try:
                new_limit = min(4096, hard_limit)
                resource.setrlimit(resource.RLIMIT_NOFILE, (new_limit, hard_limit))
                self.print_colored(f"✅ Increased file descriptor limit to {new_limit}", Fore.GREEN)
            except:
                self.print_colored(f"⚠️ Could not increase file descriptor limit automatically", Fore.YELLOW)
                
        except ImportError:
            self.print_colored(f"⚠️ Could not check system limits (resource module not available)", Fore.YELLOW)
        except Exception as e:
            self.print_colored(f"⚠️ Error checking system limits: {str(e)}", Fore.YELLOW)
        
    def print_colored(self, message: str, color=Fore.WHITE):
        """Print colored message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"{color}[{timestamp}] {message}{Style.RESET_ALL}")
    
    def generate_username(self, index: int) -> str:
        """Generate extremely unique username"""
        prefixes = ["NewYear", "Party", "Celebrate", "Festive", "Joyful", "Happy", "Cheers", "Sparkle"]
        suffixes = ["2024", "Star", "Magic", "Dream", "Wish", "Joy", "Fun", "Blast"]
        
        # Multiple uniqueness factors
        timestamp = int(time.time() * 1000000) % 1000000  # Microsecond precision
        uuid_part = str(uuid.uuid4())[:8]  # First 8 chars of UUID
        random_num = random.randint(1000, 9999)
        
        return f"{random.choice(prefixes)}{index}_{timestamp}_{uuid_part}_{random_num}_{random.choice(suffixes)}"
    
    def create_users_batch(self, start_index: int, batch_size: int) -> List[Dict]:
        """Create a batch of users using the new batch API - ULTRA FAST! 👥🚀"""
        try:
            # Prepare batch user data
            users_data = []
            for i in range(batch_size):
                username = self.generate_username(start_index + i)
                password = f"password{start_index + i}_2024"
                users_data.append({
                    "username": username,
                    "password": password
                })
            
            # Send batch request to create all users at once
            self.print_colored(f"📦 Sending batch request for {batch_size} users...", Fore.CYAN)
            
            response = requests.post(
                f"{BASE_URL}/api/auth/signup-batch",
                json={"users": users_data},
                headers={"User-Agent": self.ua.random, "Connection": "close"},
                timeout=30  # Longer timeout for batch operations
            )
            
            if response.status_code == 201:
                result = response.json()
                created_users = result.get("created", [])
                errors = result.get("errors", [])
                
                self.print_colored(f"✅ Batch created {len(created_users)} users, {len(errors)} errors", Fore.GREEN)
                
                # ULTRA FAST PARALLEL LOGIN! 🚀⚡
                self.print_colored(f"🔑 Starting parallel login for {len(created_users)} users...", Fore.CYAN)
                
                def login_single_user(user_data):
                    """Login a single user - optimized for parallel execution"""
                    try:
                        login_response = requests.post(
                            f"{BASE_URL}/api/auth/login",
                            json={"username": user_data["username"], "password": user_data["password"]},
                            headers={"User-Agent": self.ua.random, "Connection": "close"},
                            timeout=5  # Faster timeout for login
                        )
                        
                        if login_response.status_code == 200:
                            token_data = login_response.json()
                            return {
                                "username": user_data["username"],
                                "password": user_data["password"],
                                "token": token_data["token"]
                            }
                        else:
                            self.print_colored(f"❌ Login failed for {user_data['username']}: {login_response.status_code}", Fore.RED)
                            return None
                    except Exception as e:
                        self.print_colored(f"❌ Login error for {user_data['username']}: {str(e)}", Fore.RED)
                        return None
                
                # Filter only successfully created users for login
                users_to_login = [user_data for user_data in users_data 
                                 if any(created["username"] == user_data["username"] for created in created_users)]
                
                # PARALLEL LOGIN with ThreadPoolExecutor! 💥
                user_tokens = []
                max_workers = min(50, len(users_to_login))  # Up to 50 parallel logins
                
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    future_to_user = {executor.submit(login_single_user, user_data): user_data for user_data in users_to_login}
                    
                    for future in as_completed(future_to_user):
                        result = future.result()
                        if result is not None:
                            user_tokens.append(result)
                
                self.print_colored(f"🔑 PARALLEL LOGIN COMPLETE: {len(user_tokens)} tokens obtained!", Fore.GREEN)
                return user_tokens
            else:
                self.print_colored(f"❌ Batch user creation failed: {response.status_code} - {response.text}", Fore.RED)
                return []
                
        except Exception as e:
            self.print_colored(f"❌ Error in batch user creation: {str(e)}", Fore.RED)
            return []

    def create_users(self, count: int) -> List[Dict]:
        """Create multiple users using batch API - ULTRA FAST! 👥🚀"""
        self.print_colored(f"🚀 Creating {count:,} users using BATCH API...", Fore.CYAN)
        
        # Batch configuration - larger batches for better performance
        batch_size = 1000  # Process 1000 users per batch with batch API
        total_batches = (count + batch_size - 1) // batch_size
        
        all_created_users = []
        
        for batch_num in range(total_batches):
            start_index = batch_num * batch_size
            current_batch_size = min(batch_size, count - start_index)
            
            self.print_colored(f"📦 Processing batch {batch_num + 1}/{total_batches} ({current_batch_size:,} users)...", Fore.YELLOW)
            
            batch_users = self.create_users_batch(start_index, current_batch_size)
            all_created_users.extend(batch_users)
            
            self.print_colored(f"✅ Batch {batch_num + 1} completed: {len(batch_users):,} users created", Fore.GREEN)
            self.print_colored(f"📊 Total progress: {len(all_created_users):,}/{count:,} users ({len(all_created_users)/count*100:.1f}%)", Fore.CYAN)
            
            # Minimal pause between batches for maximum speed
            if batch_num < total_batches - 1:
                time.sleep(0.1)  # Ultra fast! ⚡
        
        self.users = all_created_users
        self.print_colored(f"🎉 Successfully created {len(all_created_users):,} users using BATCH API!", Fore.GREEN)
        return all_created_users
    
    def create_chatrooms(self, count: int) -> List[Dict]:
        """Create multiple chatrooms using batch API - ULTRA FAST! 🏠🚀"""
        self.print_colored(f"🏠 Creating {count} chatrooms using BATCH API...", Fore.CYAN)
        
        if not self.users:
            self.print_colored("❌ No users available to create chatrooms!", Fore.RED)
            return []
        
        try:
            # Prepare batch chatroom data
            rooms_data = []
            for i in range(count):
                room_name = f"{random.choice(CHATROOM_NAMES)} #{i+1}"
                
                # Add random participants (3-8 users)
                num_participants = random.randint(3, min(8, len(self.users)))
                participants = random.sample([u["username"] for u in self.users], num_participants)
                
                rooms_data.append({
                    "name": room_name,
                    "participants": participants
                })
            
            # Choose a random user to create all rooms (they'll be added as creator)
            creator = random.choice(self.users)
            
            # Send batch request to create all chatrooms at once
            self.print_colored(f"📦 Sending batch request for {count} chatrooms...", Fore.CYAN)
            
            response = requests.post(
                f"{BASE_URL}/api/chatrooms-batch",
                json={"rooms": rooms_data},
                headers={
                    "Authorization": f"Bearer {creator['token']}",
                    "User-Agent": self.ua.random,
                    "Connection": "close"
                },
                timeout=30  # Longer timeout for batch operations
            )
            
            if response.status_code == 201:
                result = response.json()
                created_rooms = result.get("created", [])
                errors = result.get("errors", [])
                
                self.print_colored(f"✅ Batch created {len(created_rooms)} chatrooms, {len(errors)} errors", Fore.GREEN)
                
                self.chatrooms = created_rooms
                self.print_colored(f"🎉 Successfully created {len(created_rooms)} chatrooms using BATCH API!", Fore.GREEN)
                return created_rooms
            else:
                self.print_colored(f"❌ Batch chatroom creation failed: {response.status_code} - {response.text}", Fore.RED)
                return []
                
        except Exception as e:
            self.print_colored(f"❌ Error in batch chatroom creation: {str(e)}", Fore.RED)
            return []
    
    def setup_single_socket_connection(self, user: Dict) -> Dict:
        """Setup socket connection for a single user with optimizations"""
        try:
            # Create socket with connection optimizations
            sio = socketio.Client(
                reconnection=False,  # Disable auto-reconnection to save resources
                reconnection_attempts=0,
                logger=False,  # Disable logging to reduce overhead
                engineio_logger=False
            )
            
            @sio.event
            def connect():
                # Silent connection for performance
                pass
            
            @sio.event
            def message(data):
                pass  # Handle incoming messages silently
            
            @sio.event
            def disconnect():
                # Silent disconnect for performance
                pass
            
            # Connect with authentication and timeout
            sio.connect(
                f"{SOCKET_URL}?token={user['token']}",
                headers={"User-Agent": self.ua.random, "Connection": "keep-alive"},
                wait_timeout=10  # 10 second timeout to prevent hanging
            )
            
            return {
                "username": user["username"],
                "socket": sio,
                "token": user["token"]
            }
            
        except Exception as e:
            # More specific error handling
            if "Too many open files" in str(e):
                self.print_colored(f"⚠️ File descriptor limit reached for {user['username'][:20]}...", Fore.YELLOW)
            elif "Max retries exceeded" in str(e):
                self.print_colored(f"⚠️ Connection retry limit for {user['username'][:20]}...", Fore.YELLOW)
            else:
                self.print_colored(f"❌ Connection failed for {user['username'][:20]}...: {str(e)[:50]}", Fore.RED)
            return None

    def setup_socket_connections(self):
        """Setup socket connections with ULTRA FAST optimization! 🔌⚡"""
        self.print_colored("🔌 Setting up ULTRA FAST socket connections...", Fore.CYAN)
        
        # Limit connections to prevent "Too many open files" error
        max_connections = min(len(self.users), 200)  # Increased to 200 for better performance
        self.print_colored(f"🔧 Connecting {max_connections} users with PARALLEL processing", Fore.YELLOW)
        
        # LARGER batches for faster processing
        batch_size = 50  # Process 50 connections at a time (increased from 20)
        total_batches = (max_connections + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, max_connections)
            batch_users = self.users[start_idx:end_idx]
            
            self.print_colored(f"🔌 FAST batch {batch_num + 1}/{total_batches} ({len(batch_users)} connections)...", Fore.CYAN)
            
            # INCREASED thread pool for faster processing
            with ThreadPoolExecutor(max_workers=25) as executor:  # Increased from 10 to 25
                future_to_user = {executor.submit(self.setup_single_socket_connection, user): user for user in batch_users}
                
                for future in as_completed(future_to_user):
                    result = future.result()
                    if result is not None:
                        self.sockets.append(result)
                    # REMOVED delay for maximum speed! ⚡
            
            # MINIMAL pause between batches
            if batch_num < total_batches - 1:
                time.sleep(0.2)  # Reduced from 1s to 0.2s! ⚡
        
        self.print_colored(f"🎉 ULTRA FAST SETUP COMPLETE: {len(self.sockets)} connections ready!", Fore.GREEN)
        
        if len(self.sockets) < len(self.users):
            remaining = len(self.users) - len(self.sockets)
            self.print_colored(f"⚠️ {remaining} users will participate without socket connections", Fore.YELLOW)
    
    def join_chatrooms(self):
        """Make users join their respective chatrooms - ULTRA FAST! 🚪⚡"""
        self.print_colored("🚪 ULTRA FAST chatroom joining...", Fore.CYAN)
        
        def join_user_rooms(socket_data):
            """Join all rooms for a single user - optimized for parallel execution"""
            username = socket_data["username"]
            sio = socket_data["socket"]
            joined_count = 0
            
            # Find chatrooms this user is part of
            user_rooms = [room for room in self.chatrooms if username in room.get("participants", [])]
            
            for room in user_rooms:
                try:
                    sio.emit("join_room", {"roomId": room["roomId"]})
                    joined_count += 1
                    # REMOVED delay for maximum speed! ⚡
                except Exception as e:
                    self.print_colored(f"❌ Failed to join room {room['name']} for {username}: {str(e)}", Fore.RED)
            
            return joined_count
        
        # PARALLEL ROOM JOINING! 💥
        total_joins = 0
        max_workers = min(25, len(self.sockets))  # Up to 25 parallel room joins
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_socket = {executor.submit(join_user_rooms, socket_data): socket_data for socket_data in self.sockets}
            
            for future in as_completed(future_to_socket):
                joins = future.result()
                total_joins += joins
        
        self.print_colored(f"🎉 ULTRA FAST JOIN COMPLETE: {total_joins} room joins completed!", Fore.GREEN)
    
    def start_new_year_celebration(self, duration_seconds: int = 60, messages_per_second: int = 10):
        """Start the New Year celebration with MASSIVE message bombing! 💥🚀"""
        self.print_colored("🎊🎉 STARTING MEGA MESSAGE BOMBING CELEBRATION! 🎉🎊", Fore.MAGENTA)
        self.print_colored(f"Duration: {duration_seconds} seconds", Fore.MAGENTA)
        self.print_colored(f"Target: {messages_per_second} messages per second PER THREAD!", Fore.MAGENTA)
        
        if not self.sockets or not self.chatrooms:
            self.print_colored("❌ No sockets or chatrooms available!", Fore.RED)
            return
        
        start_time = time.time()
        message_count = 0
        message_lock = threading.Lock()
        
        # Pre-calculate message combinations for ULTRA SPEED! ⚡
        socket_room_pairs = []
        for socket_data in self.sockets:
            for room in self.chatrooms:
                if socket_data["username"] in room.get("participants", []):
                    socket_room_pairs.append((socket_data, room))
        
        if not socket_room_pairs:
            self.print_colored("❌ No valid socket-room pairs found!", Fore.RED)
            return
        
        self.print_colored(f"🚀 Prepared {len(socket_room_pairs)} socket-room combinations for MEGA BOMBING!", Fore.CYAN)
        
        # Countdown
        for i in range(3, 0, -1):
            self.print_colored(f"🕐 MESSAGE BOMBING STARTS IN {i}...", Fore.YELLOW)
            time.sleep(1)
        
        self.print_colored("💥💥💥 MEGA MESSAGE BOMBING ACTIVATED! 💥💥💥", Fore.MAGENTA)
        
        def ultra_fast_message_worker(worker_id: int):
            """Ultra-fast message worker with minimal delays"""
            nonlocal message_count
            local_count = 0
            
            while time.time() - start_time < duration_seconds:
                try:
                    # Batch send multiple messages at once for ULTRA SPEED! ⚡
                    batch_size = min(10, len(socket_room_pairs))  # Send 10 messages per batch!
                    
                    for _ in range(batch_size):
                        # Random socket-room pair for maximum chaos! 💥
                        socket_data, room = random.choice(socket_room_pairs)
                        message = random.choice(NEW_YEAR_MESSAGES)
                        
                        # Fire and forget - no waiting! 🚀
                        socket_data["socket"].emit("send_message", {
                            "roomId": room["roomId"],
                            "content": f"[Worker-{worker_id}] {message}"
                        })
                        
                        local_count += 1
                    
                    # Update global counter
                    with message_lock:
                        message_count += batch_size
                        
                        # Show progress every 1000 messages for MEGA SPEED stats! 📊
                        if message_count % 1000 == 0:
                            elapsed = time.time() - start_time
                            rate = message_count / elapsed if elapsed > 0 else 0
                            self.print_colored(f"💥 BOMBED {message_count:,} messages ({rate:.0f}/sec) - Worker {worker_id} sent {local_count}", Fore.CYAN)
                
                except Exception as e:
                    # Silent error handling for maximum speed
                    pass
                
                # ULTRA MINIMAL delay for MAXIMUM SPEED! ⚡⚡⚡
                time.sleep(0.001 / messages_per_second)  # Almost no delay!
        
        # Start MASSIVE number of worker threads for MEGA BOMBING! 💥
        threads = []
        # Use ALL available sockets as workers for MAXIMUM CHAOS! 🚀
        num_threads = min(len(self.sockets), 50)  # Up to 50 parallel message bombers!
        
        self.print_colored(f"🚀 Launching {num_threads} MEGA MESSAGE BOMBERS!", Fore.MAGENTA)
        
        for worker_id in range(num_threads):
            thread = threading.Thread(target=ultra_fast_message_worker, args=(worker_id,))
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        # Real-time statistics display
        stats_start = time.time()
        while time.time() - start_time < duration_seconds:
            time.sleep(2)  # Update stats every 2 seconds
            elapsed = time.time() - start_time
            rate = message_count / elapsed if elapsed > 0 else 0
            remaining = duration_seconds - elapsed
            
            self.print_colored(f"🔥 LIVE BOMBING: {message_count:,} messages | {rate:.0f}/sec | {remaining:.0f}s left", Fore.RED)
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=1)
        
        # Final MEGA statistics
        elapsed = time.time() - start_time
        rate = message_count / elapsed if elapsed > 0 else 0
        
        self.print_colored("💥💥💥 MEGA MESSAGE BOMBING COMPLETED! 💥💥💥", Fore.MAGENTA)
        self.print_colored(f"🎯 TOTAL MESSAGES BOMBED: {message_count:,}", Fore.GREEN)
        self.print_colored(f"🚀 AVERAGE BOMBING RATE: {rate:.0f} messages/second", Fore.GREEN)
        self.print_colored(f"⏱️ BOMBING DURATION: {elapsed:.1f} seconds", Fore.GREEN)
        self.print_colored(f"💪 BOMBING THREADS USED: {num_threads}", Fore.GREEN)
        
        if rate > 1000:
            self.print_colored("🏆 MEGA BOMBING ACHIEVEMENT UNLOCKED! 🏆", Fore.MAGENTA)
        if rate > 5000:
            self.print_colored("👑 ULTRA BOMBING MASTER! 👑", Fore.MAGENTA)
    
    def cleanup(self):
        """Cleanup socket connections"""
        self.print_colored("🧹 Cleaning up connections...", Fore.CYAN)
        for socket_data in self.sockets:
            try:
                socket_data["socket"].disconnect()
            except:
                pass
        self.print_colored("✅ Cleanup completed!", Fore.GREEN)
    
    def run_full_test(self, num_users: int = 50, num_chatrooms: int = 15, 
                     celebration_duration: int = 60, messages_per_second: int = 20):
        """Run the complete New Year MEGA MESSAGE BOMBING test - ULTRA FAST! ⚡"""
        try:
            self.print_colored("💥🎊🎉 NEW YEAR MEGA MESSAGE BOMBING STARTING! 🎉🎊💥", Fore.MAGENTA)
            self.print_colored(f"💥 BOMBING CONFIGURATION:", Fore.CYAN)
            self.print_colored(f"  - Users: {num_users:,}", Fore.CYAN)
            self.print_colored(f"  - Chatrooms: {num_chatrooms}", Fore.CYAN)
            self.print_colored(f"  - Bombing Duration: {celebration_duration}s", Fore.CYAN)
            self.print_colored(f"  - Target Rate: {messages_per_second:,}/sec PER THREAD", Fore.CYAN)
            self.print_colored(f"  - Expected Total Rate: {messages_per_second * min(num_users, 50):,}/sec", Fore.RED)
            
            # ULTRA FAST EXECUTION - NO DELAYS! ⚡
            start_time = time.time()
            
            # Step 1: Create users - BATCH API
            step_start = time.time()
            self.create_users(num_users)
            step_time = time.time() - step_start
            self.print_colored(f"⚡ Step 1 completed in {step_time:.1f}s", Fore.GREEN)
            
            # Step 2: Create chatrooms - BATCH API
            step_start = time.time()
            self.create_chatrooms(num_chatrooms)
            step_time = time.time() - step_start
            self.print_colored(f"⚡ Step 2 completed in {step_time:.1f}s", Fore.GREEN)
            
            # Step 3: Setup socket connections - PARALLEL
            step_start = time.time()
            self.setup_socket_connections()
            step_time = time.time() - step_start
            self.print_colored(f"⚡ Step 3 completed in {step_time:.1f}s", Fore.GREEN)
            
            # Step 4: Join chatrooms - PARALLEL
            step_start = time.time()
            self.join_chatrooms()
            step_time = time.time() - step_start
            self.print_colored(f"⚡ Step 4 completed in {step_time:.1f}s", Fore.GREEN)
            
            # Total setup time
            total_setup_time = time.time() - start_time
            self.print_colored(f"🚀 TOTAL SETUP TIME: {total_setup_time:.1f}s (ULTRA FAST!)", Fore.MAGENTA)
            
            # Step 5: Start celebration - MEGA BOMBING!
            self.print_colored("💥 STARTING MEGA MESSAGE BOMBING NOW! 💥", Fore.RED)
            self.start_new_year_celebration(celebration_duration, messages_per_second)
            
        except KeyboardInterrupt:
            self.print_colored("⚠️ Test interrupted by user", Fore.YELLOW)
        except Exception as e:
            self.print_colored(f"❌ Test failed: {str(e)}", Fore.RED)
        finally:
            self.cleanup()

def show_menu():
    """Display the main menu"""
    print(f"\n{Fore.MAGENTA}{'='*70}")
    print(f"{Fore.MAGENTA}💥🎊🎉 NEW YEAR MEGA MESSAGE BOMBING TEST 🎉🎊💥")
    print(f"{Fore.MAGENTA}{'='*70}{Style.RESET_ALL}")
    print(f"\n{Fore.CYAN}Select your MESSAGE BOMBING level:")
    print(f"{Fore.YELLOW}1. 🚀 Quick Bombing (30 users, 10 rooms, 30s) - 100 msg/sec")
    print(f"{Fore.YELLOW}2. 🏃 Medium Bombing (100 users, 15 rooms, 60s) - 500 msg/sec")
    print(f"{Fore.YELLOW}3. 💪 Strong Bombing (500 users, 20 rooms, 120s) - 1000 msg/sec")
    print(f"{Fore.YELLOW}4. 🔥 Extreme Bombing (1000 users, 25 rooms, 180s) - 2000 msg/sec")
    print(f"{Fore.YELLOW}5. 🌟 Mega Bombing (5000 users, 30 rooms, 300s) - 5000 msg/sec")
    print(f"{Fore.YELLOW}6. 💥 Ultra Bombing (10000 users, 35 rooms, 600s) - 10000 msg/sec")
    print(f"{Fore.YELLOW}7. 🎯 Custom Bombing Settings")
    print(f"{Fore.YELLOW}8. 🧪 Connection Test Only (No bombing)")
    print(f"{Fore.RED}0. Exit")
    print(f"{Style.RESET_ALL}")

def get_custom_settings():
    """Get custom bombing settings from user"""
    print(f"\n{Fore.CYAN}💥 Enter your CUSTOM BOMBING settings:")
    
    try:
        users = int(input(f"{Fore.YELLOW}Number of users (default: 100): ") or "100")
        rooms = int(input(f"{Fore.YELLOW}Number of chatrooms (default: 15): ") or "15")
        duration = int(input(f"{Fore.YELLOW}Bombing duration in seconds (default: 60): ") or "60")
        msg_rate = int(input(f"{Fore.YELLOW}Messages per second PER THREAD (default: 1000): ") or "1000")
        
        print(f"\n{Fore.MAGENTA}💥 CUSTOM BOMBING CONFIGURATION:")
        print(f"{Fore.MAGENTA}   Users: {users}")
        print(f"{Fore.MAGENTA}   Rooms: {rooms}")
        print(f"{Fore.MAGENTA}   Duration: {duration}s")
        print(f"{Fore.MAGENTA}   Rate: {msg_rate} msg/sec per thread")
        print(f"{Fore.MAGENTA}   Expected total rate: {msg_rate * min(users, 50):,} msg/sec!")
        
        return users, rooms, duration, msg_rate
    except ValueError:
        print(f"{Fore.RED}Invalid input. Using MEGA BOMBING defaults.{Style.RESET_ALL}")
        return 100, 15, 60, 1000

def run_connection_test():
    """Run connection test only"""
    print(f"\n{Fore.CYAN}Running connection test...")
    
    try:
        users = int(input(f"{Fore.YELLOW}Number of users to test (default: 10): ") or "10")
    except ValueError:
        users = 10
    
    load_test = NewYearLoadTest()
    
    try:
        # Create users
        load_test.create_users(users)
        
        # Setup socket connections
        load_test.setup_socket_connections()
        
        print(f"\n{Fore.GREEN}✅ Connection test completed!")
        print(f"{Fore.GREEN}Users created: {len(load_test.users)}")
        print(f"{Fore.GREEN}Sockets connected: {len(load_test.sockets)}")
        
        input(f"\n{Fore.YELLOW}Press any key to cleanup connections...")
        
    except Exception as e:
        print(f"{Fore.RED}❌ Connection test failed: {str(e)}")
    finally:
        load_test.cleanup()

def main():
    """Main function with menu system"""
    
    while True:
        show_menu()
        
        try:
            choice = input(f"{Fore.GREEN}Select your choice (0-8): {Style.RESET_ALL}").strip()
            
            if choice == "0":
                print(f"{Fore.MAGENTA}🎊 Goodbye! 🎊{Style.RESET_ALL}")
                break
            
            load_test = NewYearLoadTest()
            
            if choice == "1":
                # Quick bombing
                print(f"\n{Fore.CYAN}🚀 Starting Quick Message Bombing...")
                load_test.run_full_test(30, 10, 30, 100)
                
            elif choice == "2":
                # Medium bombing
                print(f"\n{Fore.CYAN}🏃 Starting Medium Message Bombing...")
                load_test.run_full_test(100, 15, 60, 500)
                
            elif choice == "3":
                # Strong bombing
                print(f"\n{Fore.CYAN}💪 Starting Strong Message Bombing...")
                load_test.run_full_test(500, 20, 120, 1000)
                
            elif choice == "4":
                # Extreme bombing
                print(f"\n{Fore.CYAN}🔥 Starting Extreme Message Bombing...")
                load_test.run_full_test(1000, 25, 180, 2000)
                
            elif choice == "5":
                # Mega bombing
                print(f"\n{Fore.CYAN}🌟 Starting Mega Message Bombing...")
                load_test.run_full_test(5000, 30, 300, 5000)
                
            elif choice == "6":
                # Ultra bombing
                print(f"\n{Fore.CYAN}💥 Starting Ultra Message Bombing...")
                load_test.run_full_test(10000, 35, 600, 10000)
                
            elif choice == "7":
                # Custom bombing settings
                users, rooms, duration, msg_rate = get_custom_settings()
                print(f"\n{Fore.CYAN}🎯 Starting Custom Message Bombing...")
                load_test.run_full_test(users, rooms, duration, msg_rate)
                
            elif choice == "8":
                # Connection test only
                run_connection_test()
                continue  # Don't wait for input, go back to menu
                
            else:
                print(f"{Fore.RED}Invalid choice. Please select again.{Style.RESET_ALL}")
                continue
            
            # Wait for user input before showing menu again
            input(f"\n{Fore.YELLOW}Press any key to return to menu...{Style.RESET_ALL}")
            
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}⚠️ User interrupted.{Style.RESET_ALL}")
            break
        except Exception as e:
            print(f"{Fore.RED}❌ Error occurred: {str(e)}{Style.RESET_ALL}")
            input(f"\n{Fore.YELLOW}Press any key to continue...{Style.RESET_ALL}")

if __name__ == "__main__":
    main() 
 