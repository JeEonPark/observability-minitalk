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
import multiprocessing as mp
import psutil
import aiohttp
import signal
import queue
from datetime import datetime
from typing import List, Dict
import requests
import socketio
from colorama import init, Fore, Style
from fake_useragent import UserAgent
from concurrent.futures import ThreadPoolExecutor, as_completed, ProcessPoolExecutor

# Initialize colorama for colored output
init()

# Configuration - Use Kubernetes service names for internal communication
BASE_URL = "http://minitalk-backend-service.jonny.svc.cluster.local:4000"
SOCKET_URL = "http://minitalk-backend-service.jonny.svc.cluster.local:4000"

# Global worker functions for multiprocessing (must be at module level for pickling)
def create_users_worker_global(process_id, start_index, user_count):
    """Global worker function for creating users - MULTIPROCESSING COMPATIBLE! 🚀"""
    try:
        from fake_useragent import UserAgent
        import requests
        import time
        import uuid
        import random
        
        ua = UserAgent()
        
        def generate_username_worker(index: int) -> str:
            """Generate extremely unique username for worker"""
            prefixes = ["NewYear", "Party", "Celebrate", "Festive", "Joyful", "Happy", "Cheers", "Sparkle"]
            suffixes = ["2024", "Star", "Magic", "Dream", "Wish", "Joy", "Fun", "Blast"]
            
            # Multiple uniqueness factors
            timestamp = int(time.time() * 1000000) % 1000000  # Microsecond precision
            uuid_part = str(uuid.uuid4())[:8]  # First 8 chars of UUID
            random_num = random.randint(1000, 9999)
            
            return f"{random.choice(prefixes)}{index}_{timestamp}_{uuid_part}_{random_num}_{random.choice(suffixes)}"
        
        def create_users_batch_worker(start_idx: int, batch_size: int) -> list:
            """Create a batch of users - worker version"""
            try:
                # Prepare batch user data
                users_data = []
                for i in range(batch_size):
                    username = generate_username_worker(start_idx + i)
                    password = f"password{start_idx + i}_2024"
                    users_data.append({
                        "username": username,
                        "password": password
                    })
                
                # Send batch request to create all users at once
                response = requests.post(
                    f"{BASE_URL}/api/auth/signup-batch",
                    json={"users": users_data},
                    headers={"User-Agent": ua.random, "Connection": "close"},
                    timeout=120
                )
                
                if response.status_code == 201:
                    result = response.json()
                    created_users = result.get("created", [])
                    
                    # Filter only successfully created users for login
                    users_to_login = [user_data for user_data in users_data 
                                     if any(created["username"] == user_data["username"] for created in created_users)]
                    
                    if not users_to_login:
                        return []
                    
                    # BATCH LOGIN API CALL!
                    login_response = requests.post(
                        f"{BASE_URL}/api/auth/login-batch",
                        json={"users": users_to_login},
                        headers={"User-Agent": ua.random, "Connection": "close"},
                        timeout=120
                    )
                    
                    if login_response.status_code == 200:
                        login_result = login_response.json()
                        successful_logins = login_result.get("results", [])
                        
                        # Combine user data with tokens
                        user_tokens = []
                        for login_data in successful_logins:
                            # Find original user data
                            original_user = next((u for u in users_to_login if u["username"] == login_data["username"]), None)
                            if original_user:
                                user_tokens.append({
                                    "username": login_data["username"],
                                    "password": original_user["password"],
                                    "token": login_data["token"]
                                })
                        
                        return user_tokens
                    else:
                        return []
                else:
                    return []
                    
            except Exception as e:
                print(f"❌ Batch creation error: {str(e)}")
                return []
        
        print(f"🚀 Process {process_id}: Creating {user_count:,} users starting from {start_index}")
        
        # Use OPTIMIZED batch creation for worker processes
        batch_size = min(200, user_count)  # 200 per batch per process (optimized for speed)
        total_batches = (user_count + batch_size - 1) // batch_size
        
        process_users = []
        for batch_num in range(total_batches):
            batch_start = start_index + batch_num * batch_size
            current_batch_size = min(batch_size, user_count - batch_num * batch_size)
            
            batch_users = create_users_batch_worker(batch_start, current_batch_size)
            process_users.extend(batch_users)
        
        print(f"✅ Process {process_id}: Completed {len(process_users):,} users")
        return process_users
        
    except Exception as e:
        print(f"❌ Process {process_id} error: {str(e)}")
        return []

def ultra_bombing_process_global(process_id, socket_room_data, duration, msg_rate):
    """Global worker function for message bombing - MULTIPROCESSING COMPATIBLE! 💥"""
    try:
        import socketio
        import time
        import random
        from fake_useragent import UserAgent
        
        ua = UserAgent()
        local_count = 0
        start_time = time.time()
        
        print(f"🔥 Process {process_id}: BOMBING STARTED with {len(socket_room_data)} pairs")
        
        # Recreate socket connections for this process
        active_sockets = []
        for socket_info, room_info in socket_room_data:
            try:
                sio = socketio.Client(
                    reconnection=False,
                    reconnection_attempts=0,
                    logger=False,
                    engineio_logger=False
                )
                
                @sio.event
                def connect():
                    pass
                
                @sio.event
                def message(data):
                    pass
                
                @sio.event
                def disconnect():
                    pass
                
                # Connect with authentication
                sio.connect(
                    f"{SOCKET_URL}?token={socket_info['token']}",
                    headers={"User-Agent": ua.random}
                )
                
                # Join room
                sio.emit("join_room", {"roomId": room_info["roomId"]})
                
                active_sockets.append((sio, socket_info, room_info))
                
            except Exception as e:
                print(f"⚠️ Process {process_id}: Socket connection failed: {str(e)}")
                continue
        
        print(f"🔌 Process {process_id}: Connected {len(active_sockets)} sockets")
        
        # Start bombing!
        while time.time() - start_time < duration:
            try:
                # INSANE BATCH BOMBING!
                batch_size = min(1000, len(active_sockets))
                
                for _ in range(batch_size):
                    try:
                        # Random socket-room pair
                        sio, socket_info, room_info = random.choice(active_sockets)
                        message = random.choice(NEW_YEAR_MESSAGES)
                        
                        # FIRE!
                        sio.emit("send_message", {
                            "roomId": room_info["roomId"],
                            "content": f"[P{process_id}] {message}"
                        })
                        
                        local_count += 1
                    except:
                        pass  # Silent fail for maximum speed
                
                # NO DELAY FOR INSANE SPEED!
                # time.sleep(0.001 / msg_rate)  # REMOVED FOR MAXIMUM SPEED!
                
            except Exception as e:
                pass  # Continue bombing even if some fail
        
        # Cleanup connections
        for sio, _, _ in active_sockets:
            try:
                sio.disconnect()
            except:
                pass
        
        print(f"✅ Process {process_id}: BOMBING COMPLETE - {local_count:,} messages sent")
        return local_count
        
    except Exception as e:
        print(f"❌ Process {process_id} bombing error: {str(e)}")
        return 0

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

class AsyncHTTPClient:
    """Ultra-fast async HTTP client for massive parallel requests 🚀"""
    
    def __init__(self, max_connections=1000):
        self.max_connections = max_connections
        self.ua = UserAgent()
    
    async def create_session(self):
        """Create aiohttp session with optimized settings"""
        connector = aiohttp.TCPConnector(
            limit=self.max_connections,  # Max total connections
            limit_per_host=500,  # Max connections per host
            keepalive_timeout=30,
            enable_cleanup_closed=True,
            use_dns_cache=True,
            ttl_dns_cache=300
        )
        
        timeout = aiohttp.ClientTimeout(total=120, connect=10)
        
        return aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={"User-Agent": self.ua.random}
        )
    
    async def batch_post_requests(self, url: str, data_list: List[Dict], headers: Dict = None) -> List[Dict]:
        """Send multiple POST requests in parallel - MEGA FAST! 💥"""
        results = []
        
        async with await self.create_session() as session:
            tasks = []
            
            for data in data_list:
                task = self.single_post_request(session, url, data, headers)
                tasks.append(task)
            
            # Execute all requests in parallel
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    results.append({"error": str(response), "index": i})
                else:
                    results.append(response)
        
        return results
    
    async def single_post_request(self, session: aiohttp.ClientSession, url: str, data: Dict, headers: Dict = None) -> Dict:
        """Single async POST request"""
        try:
            request_headers = headers or {}
            async with session.post(url, json=data, headers=request_headers) as response:
                result = await response.json()
                return {"status": response.status, "data": result}
        except Exception as e:
            return {"error": str(e)}

class NewYearLoadTest:
    def __init__(self):
        self.users = []
        self.chatrooms = []
        self.sockets = []
        self.ua = UserAgent()
        self.async_client = AsyncHTTPClient(max_connections=2000)  # MEGA connections!
        
        # Check system limits and CPU cores
        self.check_system_limits()
        self.cpu_cores = mp.cpu_count()
        self.print_colored(f"🔥 Detected {self.cpu_cores} CPU cores - MEGA POWER AVAILABLE!", Fore.MAGENTA)
    
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
                timeout=120  # Longer timeout for large batches
            )
            
            if response.status_code == 201:
                result = response.json()
                created_users = result.get("created", [])
                errors = result.get("errors", [])
                
                self.print_colored(f"✅ Batch created {len(created_users)} users, {len(errors)} errors", Fore.GREEN)
                
                # ULTRA FAST BATCH LOGIN! 🚀⚡
                self.print_colored(f"🔑 Starting BATCH LOGIN for {len(created_users)} users...", Fore.CYAN)
                
                # Filter only successfully created users for login
                users_to_login = [user_data for user_data in users_data 
                                 if any(created["username"] == user_data["username"] for created in created_users)]
                
                if not users_to_login:
                    self.print_colored("⚠️ No users to login!", Fore.YELLOW)
                    return []
                
                # BATCH LOGIN API CALL! 💥🚀
                login_response = requests.post(
                    f"{BASE_URL}/api/auth/login-batch",
                    json={"users": users_to_login},
                    headers={"User-Agent": self.ua.random, "Connection": "close"},
                    timeout=120  # Longer timeout for batch login
                )
                
                if login_response.status_code == 200:
                    login_result = login_response.json()
                    successful_logins = login_result.get("results", [])
                    login_errors = login_result.get("errors", [])
                    
                    self.print_colored(f"🔑 BATCH LOGIN COMPLETE: {len(successful_logins)} tokens obtained, {len(login_errors)} errors!", Fore.GREEN)
                    
                    # Combine user data with tokens
                    user_tokens = []
                    for login_data in successful_logins:
                        # Find original user data
                        original_user = next((u for u in users_to_login if u["username"] == login_data["username"]), None)
                        if original_user:
                            user_tokens.append({
                                "username": login_data["username"],
                                "password": original_user["password"],
                                "token": login_data["token"]
                            })
                    
                    return user_tokens
                else:
                    self.print_colored(f"❌ Batch login failed: {login_response.status_code} - {login_response.text}", Fore.RED)
                    return []
            else:
                self.print_colored(f"❌ Batch user creation failed: {response.status_code} - {response.text}", Fore.RED)
                return []
                
        except Exception as e:
            self.print_colored(f"❌ Error in batch user creation: {str(e)}", Fore.RED)
            return []

    async def create_users_async_mega(self, count: int) -> List[Dict]:
        """Create users using ASYNC MEGA PARALLEL processing - ULTIMATE SPEED! 🚀💥"""
        self.print_colored(f"🚀💥 Creating {count:,} users using ASYNC MEGA PARALLEL...", Fore.MAGENTA)
        
        start_time = time.time()
        
        # Prepare ALL user data at once
        all_users_data = []
        for i in range(count):
            username = self.generate_username(i)
            password = f"password{i}_2024"
            all_users_data.append({
                "username": username,
                "password": password
            })
        
        self.print_colored(f"📦 Prepared {len(all_users_data):,} user records in memory", Fore.CYAN)
        
        # Split into OPTIMIZED batches for async processing
        mega_batch_size = 500  # 500 users per async batch (optimized for speed)
        batches = [all_users_data[i:i + mega_batch_size] for i in range(0, len(all_users_data), mega_batch_size)]
        
        self.print_colored(f"🔥 Split into {len(batches)} MEGA ASYNC batches of {mega_batch_size:,} users each", Fore.MAGENTA)
        
        # Process all batches in parallel using asyncio
        all_created_users = []
        
        async def process_mega_batch(batch_data, batch_num):
            """Process one mega batch asynchronously"""
            self.print_colored(f"🚀 ASYNC BATCH {batch_num + 1}: Processing {len(batch_data):,} users...", Fore.YELLOW)
            
            # Create users
            signup_response = await self.async_client.batch_post_requests(
                f"{BASE_URL}/api/auth/signup-batch",
                [{"users": batch_data}]
            )
            
            if not signup_response or "error" in signup_response[0]:
                self.print_colored(f"❌ ASYNC BATCH {batch_num + 1} signup failed", Fore.RED)
                return []
            
            signup_result = signup_response[0]["data"]
            created_users = signup_result.get("created", [])
            
            # Filter for successful users
            users_to_login = [user_data for user_data in batch_data 
                             if any(created["username"] == user_data["username"] for created in created_users)]
            
            if not users_to_login:
                return []
            
            # Login users
            login_response = await self.async_client.batch_post_requests(
                f"{BASE_URL}/api/auth/login-batch",
                [{"users": users_to_login}]
            )
            
            if not login_response or "error" in login_response[0]:
                self.print_colored(f"❌ ASYNC BATCH {batch_num + 1} login failed", Fore.RED)
                return []
            
            login_result = login_response[0]["data"]
            successful_logins = login_result.get("results", [])
            
            # Combine data with tokens
            user_tokens = []
            for login_data in successful_logins:
                original_user = next((u for u in users_to_login if u["username"] == login_data["username"]), None)
                if original_user:
                    user_tokens.append({
                        "username": login_data["username"],
                        "password": original_user["password"],
                        "token": login_data["token"]
                    })
            
            self.print_colored(f"✅ ASYNC BATCH {batch_num + 1}: {len(user_tokens):,} users completed", Fore.GREEN)
            return user_tokens
        
        # Execute all mega batches in parallel!
        tasks = [process_mega_batch(batch, i) for i, batch in enumerate(batches)]
        batch_results = await asyncio.gather(*tasks)
        
        # Combine all results
        for batch_result in batch_results:
            all_created_users.extend(batch_result)
        
        total_time = time.time() - start_time
        avg_users_per_sec = len(all_created_users) / total_time if total_time > 0 else 0
        
        self.users = all_created_users
        self.print_colored(f"🎉💥 ASYNC MEGA SUCCESS: {len(all_created_users):,} users in {total_time:.2f}s ({avg_users_per_sec:.0f} users/sec)!", Fore.MAGENTA)
        return all_created_users

    def create_users_multiprocess_ultra(self, count: int) -> List[Dict]:
        """Create users using MULTIPROCESSING ULTRA POWER - INSANE SPEED! 💥🔥"""
        self.print_colored(f"🔥💥 Creating {count:,} users using MULTIPROCESSING ULTRA POWER...", Fore.RED)
        
        start_time = time.time()
        
        # Use ALL CPU cores for maximum power!
        num_processes = self.cpu_cores * 2  # Hyperthreading advantage
        users_per_process = count // num_processes
        remaining_users = count % num_processes
        
        self.print_colored(f"💪 Launching {num_processes} processes ({users_per_process:,} users each)", Fore.RED)
        
        # Use global worker function (defined at module level for pickling)
        
        # Create process arguments
        process_args = []
        current_start = 0
        
        for i in range(num_processes):
            user_count = users_per_process + (1 if i < remaining_users else 0)
            process_args.append((i, current_start, user_count))
            current_start += user_count
        
        # Execute all processes in parallel!
        all_created_users = []
        
        with ProcessPoolExecutor(max_workers=num_processes) as executor:
            future_to_process = {executor.submit(create_users_worker_global, *args): args[0] for args in process_args}
            
            for future in as_completed(future_to_process):
                process_id = future_to_process[future]
                try:
                    result = future.result()
                    all_created_users.extend(result)
                    self.print_colored(f"🎯 Process {process_id} finished: {len(result):,} users", Fore.GREEN)
                except Exception as e:
                    self.print_colored(f"❌ Process {process_id} failed: {str(e)}", Fore.RED)
        
        total_time = time.time() - start_time
        avg_users_per_sec = len(all_created_users) / total_time if total_time > 0 else 0
        
        self.users = all_created_users
        self.print_colored(f"🎉🔥 MULTIPROCESS ULTRA SUCCESS: {len(all_created_users):,} users in {total_time:.2f}s ({avg_users_per_sec:.0f} users/sec)!", Fore.RED)
        return all_created_users

    def create_users_standard_batch(self, count: int) -> List[Dict]:
        """Create users using STANDARD MEGA BATCH processing - STABLE & FAST! 💪🚀"""
        self.print_colored(f"💪 Creating {count:,} users using STANDARD MEGA BATCH...", Fore.CYAN)
        
        # OPTIMIZED BATCH configuration for stability and speed
        batch_size = min(200, count)  # 200 users per batch for optimal performance
        total_batches = (count + batch_size - 1) // batch_size
        
        all_created_users = []
        start_time = time.time()
        
        self.print_colored(f"⚡ STANDARD BATCH MODE: {batch_size:,} users per batch, {total_batches} total batches", Fore.CYAN)
        
        for batch_num in range(total_batches):
            batch_start_time = time.time()
            start_index = batch_num * batch_size
            current_batch_size = min(batch_size, count - start_index)
            
            self.print_colored(f"📦 Processing STANDARD BATCH {batch_num + 1}/{total_batches} ({current_batch_size:,} users)...", Fore.YELLOW)
            
            batch_users = self.create_users_batch(start_index, current_batch_size)
            all_created_users.extend(batch_users)
            
            batch_time = time.time() - batch_start_time
            users_per_sec = len(batch_users) / batch_time if batch_time > 0 else 0
            
            self.print_colored(f"✅ STANDARD BATCH {batch_num + 1} completed: {len(batch_users):,} users in {batch_time:.2f}s ({users_per_sec:.0f} users/sec)", Fore.GREEN)
            self.print_colored(f"📊 Total progress: {len(all_created_users):,}/{count:,} users ({len(all_created_users)/count*100:.1f}%)", Fore.CYAN)
            
            # Small pause between batches for server stability
            if batch_num < total_batches - 1:
                time.sleep(0.5)  # 0.5s pause for server breathing room
        
        total_time = time.time() - start_time
        avg_users_per_sec = len(all_created_users) / total_time if total_time > 0 else 0
        
        self.users = all_created_users
        self.print_colored(f"🎉💪 STANDARD BATCH SUCCESS: {len(all_created_users):,} users created in {total_time:.2f}s ({avg_users_per_sec:.0f} users/sec)!", Fore.GREEN)
        return all_created_users

    def create_users(self, count: int) -> List[Dict]:
        """Create multiple users using the FASTEST method available! 👥🚀"""
        self.print_colored(f"🚀 Creating {count:,} users using ULTIMATE SPEED METHOD...", Fore.CYAN)
        
        # Choose the best method based on user count with OPTIMIZED thresholds
        if count <= 100:
            # For smaller counts, use standard batch processing (ASYNC has issues)
            self.print_colored("💪 Using STANDARD MEGA BATCH method", Fore.CYAN)
            return self.create_users_standard_batch(count)
        elif count <= 20000:
            # For medium counts, use standard batch processing
            self.print_colored("💪 Using STANDARD MEGA BATCH method", Fore.CYAN)
            return self.create_users_standard_batch(count)
        else:
            # For massive counts, use multiprocessing ultra power
            self.print_colored("🔥 Using MULTIPROCESSING ULTRA POWER method", Fore.RED)
            return self.create_users_multiprocess_ultra(count)
    
    def create_chatrooms(self, count: int) -> List[Dict]:
        """Create multiple chatrooms using MEGA BATCH API - ULTRA FAST! 🏠🚀"""
        self.print_colored(f"🏠 Creating {count} chatrooms using MEGA BATCH API...", Fore.CYAN)
        
        if not self.users:
            self.print_colored("❌ No users available to create chatrooms!", Fore.RED)
            return []
        
        try:
            start_time = time.time()
            
            # Prepare MEGA batch chatroom data
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
            
            # Send MEGA batch request to create all chatrooms at once
            self.print_colored(f"📦 Sending MEGA BATCH request for {count} chatrooms...", Fore.CYAN)
            
            response = requests.post(
                f"{BASE_URL}/api/chatrooms-batch",
                json={"rooms": rooms_data},
                headers={
                    "Authorization": f"Bearer {creator['token']}",
                    "User-Agent": self.ua.random,
                    "Connection": "close"
                },
                timeout=120  # Much longer timeout for mega batches
            )
            
            if response.status_code == 201:
                result = response.json()
                created_rooms = result.get("created", [])
                errors = result.get("errors", [])
                
                total_time = time.time() - start_time
                rooms_per_sec = len(created_rooms) / total_time if total_time > 0 else 0
                
                self.print_colored(f"✅ MEGA BATCH created {len(created_rooms)} chatrooms in {total_time:.2f}s ({rooms_per_sec:.0f} rooms/sec), {len(errors)} errors", Fore.GREEN)
                
                self.chatrooms = created_rooms
                self.print_colored(f"🎉 MEGA BATCH SUCCESS: {len(created_rooms)} chatrooms created using MEGA BATCH API!", Fore.GREEN)
                return created_rooms
            else:
                self.print_colored(f"❌ MEGA BATCH chatroom creation failed: {response.status_code} - {response.text}", Fore.RED)
                return []
                
        except Exception as e:
            self.print_colored(f"❌ Error in MEGA BATCH chatroom creation: {str(e)}", Fore.RED)
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
        """Setup socket connections with MEGA FAST optimization! 🔌⚡"""
        self.print_colored("🔌 Setting up MEGA FAST socket connections...", Fore.CYAN)
        
        # MEGA connections for maximum performance
        max_connections = min(len(self.users), 1000)  # MEGA increased to 1000!
        self.print_colored(f"🔧 Connecting {max_connections} users with MEGA PARALLEL processing", Fore.YELLOW)
        
        start_time = time.time()
        
        # MEGA LARGE batches for ULTRA fast processing
        batch_size = 500  # Process 500 connections at a time! 🚀
        total_batches = (max_connections + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            batch_start_time = time.time()
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, max_connections)
            batch_users = self.users[start_idx:end_idx]
            
            self.print_colored(f"🔌 MEGA batch {batch_num + 1}/{total_batches} ({len(batch_users)} connections)...", Fore.CYAN)
            
            # MEGA INCREASED thread pool for ULTRA fast processing
            with ThreadPoolExecutor(max_workers=50) as executor:  # MEGA increased to 50!
                future_to_user = {executor.submit(self.setup_single_socket_connection, user): user for user in batch_users}
                
                for future in as_completed(future_to_user):
                    result = future.result()
                    if result is not None:
                        self.sockets.append(result)
                    # NO delay for MAXIMUM speed! ⚡⚡⚡
            
            batch_time = time.time() - batch_start_time
            connections_per_sec = len(batch_users) / batch_time if batch_time > 0 else 0
            self.print_colored(f"✅ MEGA batch {batch_num + 1} completed in {batch_time:.2f}s ({connections_per_sec:.0f} conn/sec)", Fore.GREEN)
            
            # NO PAUSE! MAXIMUM SPEED! ⚡⚡⚡
        
        total_time = time.time() - start_time
        avg_connections_per_sec = len(self.sockets) / total_time if total_time > 0 else 0
        
        self.print_colored(f"🎉 MEGA FAST SETUP COMPLETE: {len(self.sockets)} connections in {total_time:.2f}s ({avg_connections_per_sec:.0f} conn/sec)!", Fore.GREEN)
        
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
    
    def start_new_year_celebration_multiprocess(self, duration_seconds: int = 60, messages_per_second: int = 10):
        """Start MULTIPROCESS ULTRA MESSAGE BOMBING - INSANE SPEED! 💥🔥🚀"""
        self.print_colored("🔥💥🚀 STARTING MULTIPROCESS ULTRA MESSAGE BOMBING! 🚀💥🔥", Fore.RED)
        self.print_colored(f"Duration: {duration_seconds} seconds", Fore.RED)
        self.print_colored(f"Target: {messages_per_second:,} messages per second PER PROCESS!", Fore.RED)
        self.print_colored(f"CPU Cores: {self.cpu_cores} - FULL POWER ENGAGED!", Fore.RED)
        
        if not self.sockets or not self.chatrooms:
            self.print_colored("❌ No sockets or chatrooms available!", Fore.RED)
            return
        
        # Prepare data for multiprocessing
        socket_room_pairs = []
        for socket_data in self.sockets:
            for room in self.chatrooms:
                if socket_data["username"] in room.get("participants", []):
                    socket_room_pairs.append((socket_data, room))
        
        if not socket_room_pairs:
            self.print_colored("❌ No valid socket-room pairs found!", Fore.RED)
            return
        
        self.print_colored(f"🚀 Prepared {len(socket_room_pairs):,} socket-room combinations", Fore.MAGENTA)
        
        # Use ALL CPU cores for maximum bombing power!
        num_processes = self.cpu_cores * 2  # Hyperthreading advantage
        
        self.print_colored(f"💥 Launching {num_processes} BOMBING PROCESSES", Fore.RED)
        
        # Prepare socket-room data for multiprocessing (serialize socket info, not actual sockets)
        socket_room_data = []
        for socket_data in self.sockets:
            for room in self.chatrooms:
                if socket_data["username"] in room.get("participants", []):
                    # Store serializable data only
                    socket_info = {
                        "username": socket_data["username"],
                        "token": socket_data["token"]
                    }
                    room_info = {
                        "roomId": room["roomId"],
                        "name": room["name"]
                    }
                    socket_room_data.append((socket_info, room_info))
        
        # Split socket-room data among processes
        pairs_per_process = len(socket_room_data) // num_processes
        process_chunks = []
        for i in range(num_processes):
            start_idx = i * pairs_per_process
            end_idx = start_idx + pairs_per_process if i < num_processes - 1 else len(socket_room_data)
            process_chunks.append(socket_room_data[start_idx:end_idx])
        
        # Countdown
        for i in range(3, 0, -1):
            self.print_colored(f"🕐 MULTIPROCESS BOMBING STARTS IN {i}...", Fore.YELLOW)
            time.sleep(1)
        
        self.print_colored("💥🔥💥 MULTIPROCESS ULTRA BOMBING ACTIVATED! 💥🔥💥", Fore.RED)
        
        start_time = time.time()
        
        # Launch all bombing processes!
        with ProcessPoolExecutor(max_workers=num_processes) as executor:
            futures = []
            for i, chunk in enumerate(process_chunks):
                future = executor.submit(ultra_bombing_process_global, i, chunk, duration_seconds, messages_per_second)
                futures.append(future)
            
            # Wait for all processes to complete and collect results
            total_messages = 0
            completed_processes = 0
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    total_messages += result
                    completed_processes += 1
                    
                    elapsed = time.time() - start_time
                    current_rate = total_messages / elapsed if elapsed > 0 else 0
                    
                    self.print_colored(f"🔥💥 Process {completed_processes}/{num_processes} completed: {result:,} messages | Total: {total_messages:,} | Rate: {current_rate:.0f}/sec", Fore.RED)
                    
                except Exception as e:
                    self.print_colored(f"❌ Process failed: {str(e)}", Fore.RED)
        
        # Final ULTRA statistics
        elapsed = time.time() - start_time
        rate = total_messages / elapsed if elapsed > 0 else 0
        
        self.print_colored("💥🔥💥 MULTIPROCESS ULTRA BOMBING COMPLETED! 💥🔥💥", Fore.RED)
        self.print_colored(f"🎯 TOTAL MESSAGES BOMBED: {total_messages:,}", Fore.GREEN)
        self.print_colored(f"🚀 AVERAGE BOMBING RATE: {rate:.0f} messages/second", Fore.GREEN)
        self.print_colored(f"⏱️ BOMBING DURATION: {elapsed:.1f} seconds", Fore.GREEN)
        self.print_colored(f"💪 BOMBING PROCESSES USED: {num_processes}", Fore.GREEN)
        self.print_colored(f"🔥 MESSAGES PER PROCESS: {total_messages // num_processes if num_processes > 0 else 0:,}", Fore.GREEN)
        
        if rate > 10000:
            self.print_colored("🏆 MULTIPROCESS BOMBING MASTER! 🏆", Fore.RED)
        if rate > 50000:
            self.print_colored("👑 ULTIMATE BOMBING EMPEROR! 👑", Fore.RED)
        if rate > 100000:
            self.print_colored("🌟 LEGENDARY BOMBING GOD! 🌟", Fore.RED)

    def start_new_year_celebration(self, duration_seconds: int = 60, messages_per_second: int = 10):
        """Start the New Year celebration with ULTIMATE BOMBING METHOD! 💥🚀"""
        self.print_colored("🎊🎉 SELECTING ULTIMATE BOMBING METHOD! 🎉🎊", Fore.MAGENTA)
        
        # Choose bombing method based on scale
        if messages_per_second >= 10000 or len(self.sockets) >= 1000:
            # For massive scale, use multiprocess bombing
            self.print_colored("🔥 ENGAGING MULTIPROCESS ULTRA BOMBING MODE!", Fore.RED)
            self.start_new_year_celebration_multiprocess(duration_seconds, messages_per_second)
        else:
            # For smaller scale, use threaded bombing
            self.print_colored("🚀 ENGAGING MEGA THREADED BOMBING MODE!", Fore.MAGENTA)
            self.start_new_year_celebration_threaded(duration_seconds, messages_per_second)
    
    def start_new_year_celebration_threaded(self, duration_seconds: int = 60, messages_per_second: int = 10):
        """Start threaded message bombing - MEGA FAST! 💥🚀"""
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
                    batch_size = min(500, len(socket_room_pairs))  # MASSIVE 500 messages per batch!
                    
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
                        
                        # Show progress every 10000 messages for MEGA SPEED stats! 📊
                        if message_count % 10000 == 0:
                            elapsed = time.time() - start_time
                            rate = message_count / elapsed if elapsed > 0 else 0
                            self.print_colored(f"💥 BOMBED {message_count:,} messages ({rate:.0f}/sec) - Worker {worker_id} sent {local_count}", Fore.CYAN)
                
                except Exception as e:
                    # Silent error handling for maximum speed
                    pass
                
                # NO DELAY FOR INSANE SPEED! ⚡⚡⚡
                # time.sleep(0.0001 / messages_per_second)  # REMOVED DELAY FOR MAXIMUM SPEED!
        
        # Start MASSIVE number of worker threads for MEGA BOMBING! 💥
        threads = []
        # Use INSANE number of threads for maximum chaos! 🚀
        num_threads = min(len(self.sockets), 1000)  # Up to 1000 parallel message bombers!
        
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
        if rate > 10000:
            self.print_colored("🌟 LEGENDARY BOMBING CHAMPION! 🌟", Fore.MAGENTA)
    
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
            self.print_colored(f"💥 MEGA BOMBING CONFIGURATION:", Fore.CYAN)
            self.print_colored(f"  - Users: {num_users:,}", Fore.CYAN)
            self.print_colored(f"  - Chatrooms: {num_chatrooms}", Fore.CYAN)
            self.print_colored(f"  - Bombing Duration: {celebration_duration}s", Fore.CYAN)
            self.print_colored(f"  - Target Rate: {messages_per_second:,}/sec PER THREAD", Fore.CYAN)
            self.print_colored(f"  - Expected Total Rate: {messages_per_second * min(num_users, 50):,}/sec", Fore.RED)
            
            # MEGA FAST EXECUTION - NO DELAYS! ⚡
            start_time = time.time()
            
            # Step 1: Create users - MEGA BATCH API
            self.print_colored("🚀 STEP 1: MEGA BATCH USER CREATION", Fore.MAGENTA)
            step_start = time.time()
            self.create_users(num_users)
            step_time = time.time() - step_start
            users_per_sec = len(self.users) / step_time if step_time > 0 else 0
            self.print_colored(f"⚡ Step 1 MEGA FAST: {len(self.users):,} users in {step_time:.1f}s ({users_per_sec:.0f} users/sec)", Fore.GREEN)
            
            # Step 2: Create chatrooms - MEGA BATCH API
            self.print_colored("🚀 STEP 2: MEGA BATCH CHATROOM CREATION", Fore.MAGENTA)
            step_start = time.time()
            self.create_chatrooms(num_chatrooms)
            step_time = time.time() - step_start
            rooms_per_sec = len(self.chatrooms) / step_time if step_time > 0 else 0
            self.print_colored(f"⚡ Step 2 MEGA FAST: {len(self.chatrooms)} rooms in {step_time:.1f}s ({rooms_per_sec:.0f} rooms/sec)", Fore.GREEN)
            
            # Step 3: Setup socket connections - MEGA PARALLEL
            self.print_colored("🚀 STEP 3: MEGA PARALLEL SOCKET CONNECTIONS", Fore.MAGENTA)
            step_start = time.time()
            self.setup_socket_connections()
            step_time = time.time() - step_start
            connections_per_sec = len(self.sockets) / step_time if step_time > 0 else 0
            self.print_colored(f"⚡ Step 3 MEGA FAST: {len(self.sockets)} connections in {step_time:.1f}s ({connections_per_sec:.0f} conn/sec)", Fore.GREEN)
            
            # Step 4: Join chatrooms - MEGA PARALLEL
            self.print_colored("🚀 STEP 4: MEGA PARALLEL CHATROOM JOINING", Fore.MAGENTA)
            step_start = time.time()
            self.join_chatrooms()
            step_time = time.time() - step_start
            self.print_colored(f"⚡ Step 4 MEGA FAST: Room joining in {step_time:.1f}s", Fore.GREEN)
            
            # Total setup time and performance summary
            total_setup_time = time.time() - start_time
            total_operations = len(self.users) + len(self.chatrooms) + len(self.sockets)
            ops_per_sec = total_operations / total_setup_time if total_setup_time > 0 else 0
            
            self.print_colored("🎯 MEGA PERFORMANCE SUMMARY:", Fore.MAGENTA)
            self.print_colored(f"  📊 Total Setup Time: {total_setup_time:.1f}s", Fore.CYAN)
            self.print_colored(f"  📊 Total Operations: {total_operations:,}", Fore.CYAN)
            self.print_colored(f"  📊 Operations/Second: {ops_per_sec:.0f}", Fore.CYAN)
            self.print_colored(f"  📊 Users Created: {len(self.users):,}", Fore.CYAN)
            self.print_colored(f"  📊 Rooms Created: {len(self.chatrooms)}", Fore.CYAN)
            self.print_colored(f"  📊 Sockets Connected: {len(self.sockets)}", Fore.CYAN)
            
            if ops_per_sec > 1000:
                self.print_colored("🏆 MEGA PERFORMANCE ACHIEVEMENT UNLOCKED! 🏆", Fore.MAGENTA)
            if ops_per_sec > 5000:
                self.print_colored("👑 ULTRA PERFORMANCE MASTER! 👑", Fore.MAGENTA)
            
            # Step 5: Start celebration - MEGA BOMBING!
            self.print_colored("💥💥💥 STARTING MEGA MESSAGE BOMBING NOW! 💥💥💥", Fore.RED)
            self.start_new_year_celebration(celebration_duration, messages_per_second)
            
        except KeyboardInterrupt:
            self.print_colored("⚠️ Test interrupted by user", Fore.YELLOW)
        except Exception as e:
            self.print_colored(f"❌ Test failed: {str(e)}", Fore.RED)
        finally:
            self.cleanup()

def show_menu():
    """Display the main menu"""
    print(f"\n{Fore.MAGENTA}{'='*80}")
    print(f"{Fore.MAGENTA}💥🎊🎉 NEW YEAR ULTIMATE MESSAGE BOMBING TEST 🎉🎊💥")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"\n{Fore.CYAN}Select your MESSAGE BOMBING level:")
    print(f"{Fore.YELLOW}1. 🎯 Light Bombing (10 users, 5 rooms, 60s) - 50 msg/sec")
    print(f"{Fore.YELLOW}2. 🚀 Quick Bombing (30 users, 10 rooms, 30s) - 1000 msg/sec")
    print(f"{Fore.YELLOW}3. 🏃 Medium Bombing (100 users, 15 rooms, 60s) - 5000 msg/sec")
    print(f"{Fore.YELLOW}4. 💪 Strong Bombing (500 users, 20 rooms, 120s) - 10000 msg/sec")
    print(f"{Fore.YELLOW}5. 🔥 Extreme Bombing (1000 users, 25 rooms, 180s) - 20000 msg/sec")
    print(f"{Fore.YELLOW}6. 🌟 Mega Bombing (5000 users, 30 rooms, 300s) - 50000 msg/sec")
    print(f"{Fore.YELLOW}7. 💥 Ultra Bombing (10000 users, 35 rooms, 600s) - 100000 msg/sec")
    print(f"{Fore.RED}8. 🔥 MULTIPROCESS INSANE (50000 users, 50 rooms, 900s) - 50000 msg/sec")
    print(f"{Fore.RED}9. 💀 APOCALYPSE MODE (100000 users, 100 rooms, 1200s) - 100000 msg/sec")
    print(f"{Fore.MAGENTA}10. 🌟 ASYNC MEGA PARALLEL (25000 users, 40 rooms, 600s) - 25000 msg/sec")
    print(f"{Fore.YELLOW}11. 🎯 Custom Bombing Settings")
    print(f"{Fore.YELLOW}12. 🧪 Connection Test Only (No bombing)")
    print(f"{Fore.RED}0. Exit")
    print(f"\n{Fore.GREEN}💡 TIP: Options 8-10 use advanced multiprocessing/async for INSANE performance!")
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
            choice = input(f"{Fore.GREEN}Select your choice (0-12): {Style.RESET_ALL}").strip()
            
            if choice == "0":
                print(f"{Fore.MAGENTA}🎊 Goodbye! 🎊{Style.RESET_ALL}")
                break
            
            load_test = NewYearLoadTest()
            
            if choice == "1":
                # Light bombing
                print(f"\n{Fore.CYAN}🎯 Starting Light Message Bombing...")
                load_test.run_full_test(10, 5, 60, 50)
                
            elif choice == "2":
                # Quick bombing
                print(f"\n{Fore.CYAN}🚀 Starting Quick Message Bombing...")
                load_test.run_full_test(30, 10, 30, 1000)
                
            elif choice == "3":
                # Medium bombing
                print(f"\n{Fore.CYAN}🏃 Starting Medium Message Bombing...")
                load_test.run_full_test(100, 15, 60, 5000)
                
            elif choice == "4":
                # Strong bombing
                print(f"\n{Fore.CYAN}💪 Starting Strong Message Bombing...")
                load_test.run_full_test(500, 20, 120, 10000)
                
            elif choice == "5":
                # Extreme bombing
                print(f"\n{Fore.CYAN}🔥 Starting Extreme Message Bombing...")
                load_test.run_full_test(1000, 25, 180, 20000)
                
            elif choice == "6":
                # Mega bombing
                print(f"\n{Fore.CYAN}🌟 Starting Mega Message Bombing...")
                load_test.run_full_test(5000, 30, 300, 50000)
                
            elif choice == "7":
                # Ultra bombing
                print(f"\n{Fore.CYAN}💥 Starting Ultra Message Bombing...")
                load_test.run_full_test(10000, 35, 600, 100000)
                
            elif choice == "8":
                # MULTIPROCESS INSANE
                print(f"\n{Fore.RED}🔥 Starting MULTIPROCESS INSANE BOMBING...")
                print(f"{Fore.RED}⚠️ WARNING: This will use ALL CPU cores and create 50,000 users!")
                confirm = input(f"{Fore.YELLOW}Are you sure? (yes/no): {Style.RESET_ALL}").strip().lower()
                if confirm == "yes":
                    load_test.run_full_test(50000, 50, 900, 50000)
                else:
                    print(f"{Fore.YELLOW}MULTIPROCESS INSANE cancelled.{Style.RESET_ALL}")
                    continue
                
            elif choice == "9":
                # APOCALYPSE MODE
                print(f"\n{Fore.RED}💀 Starting APOCALYPSE MODE...")
                print(f"{Fore.RED}🚨 EXTREME WARNING: This will create 100,000 users and may crash your system!")
                print(f"{Fore.RED}🚨 Only proceed if you have a powerful machine and want to test limits!")
                confirm = input(f"{Fore.YELLOW}Type 'APOCALYPSE' to confirm: {Style.RESET_ALL}").strip()
                if confirm == "APOCALYPSE":
                    load_test.run_full_test(100000, 100, 1200, 100000)
                else:
                    print(f"{Fore.YELLOW}APOCALYPSE MODE cancelled.{Style.RESET_ALL}")
                    continue
                
            elif choice == "10":
                # ASYNC MEGA PARALLEL
                print(f"\n{Fore.MAGENTA}🌟 Starting ASYNC MEGA PARALLEL BOMBING...")
                print(f"{Fore.MAGENTA}💡 This uses async I/O for maximum efficiency!")
                load_test.run_full_test(25000, 40, 600, 25000)
                
            elif choice == "11":
                # Custom bombing settings
                users, rooms, duration, msg_rate = get_custom_settings()
                print(f"\n{Fore.CYAN}🎯 Starting Custom Message Bombing...")
                load_test.run_full_test(users, rooms, duration, msg_rate)
                
            elif choice == "12":
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
    # Required for multiprocessing on Windows and some Unix systems
    mp.set_start_method('spawn', force=True)
    main() 
 