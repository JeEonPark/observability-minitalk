#!/usr/bin/env python3
"""
Light Load Test Script for AWS
Reduced load testing for AWS resource constraints
"""

import asyncio
import random
import time
import json
import requests
import socketio
from colorama import init, Fore, Style
from concurrent.futures import ThreadPoolExecutor
import threading

# Initialize colorama for colored output
init()

# Configuration - Use Kubernetes service names for internal communication
BASE_URL = "http://minitalk-frontend-service.jonny.svc.cluster.local:3000"
SOCKET_URL = "http://minitalk-frontend-service.jonny.svc.cluster.local:3000"

class LightLoadTest:
    def __init__(self):
        self.users = []
        self.chatrooms = []
        self.sockets = []
        
    def print_colored(self, message: str, color=Fore.WHITE):
        """Print colored message with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"{color}[{timestamp}] {message}{Style.RESET_ALL}")
        
    def generate_username(self, index: int) -> str:
        """Generate simple username"""
        prefixes = ["User", "Test", "Demo", "Guest"]
        return f"{random.choice(prefixes)}{index}_{int(time.time() * 1000) % 10000}"
    
    def create_users(self, count: int) -> list:
        """Create users with simple batch processing"""
        self.print_colored(f"🚀 Creating {count} users...", Fore.CYAN)
        
        created_users = []
        for i in range(count):
            try:
                username = self.generate_username(i)
                password = f"password{i}"
                
                # Sign up
                response = requests.post(
                    f"{BASE_URL}/api/auth/signup",
                    json={"username": username, "password": password},
                    timeout=30
                )
                
                if response.status_code == 201:
                    # Login
                    login_response = requests.post(
                        f"{BASE_URL}/api/auth/login",
                        json={"username": username, "password": password},
                        timeout=30
                    )
                    
                    if login_response.status_code == 200:
                        token = login_response.json().get("token")
                        created_users.append({
                            "username": username,
                            "password": password,
                            "token": token
                        })
                        self.print_colored(f"✅ Created user: {username}", Fore.GREEN)
                    else:
                        self.print_colored(f"❌ Login failed for: {username}", Fore.RED)
                else:
                    self.print_colored(f"❌ Signup failed for: {username}", Fore.RED)
                    
            except Exception as e:
                self.print_colored(f"❌ Error creating user {i}: {str(e)}", Fore.RED)
                
        self.users = created_users
        self.print_colored(f"✅ Created {len(created_users)} users successfully", Fore.GREEN)
        return created_users
    
    def create_chatrooms(self, count: int) -> list:
        """Create chatrooms"""
        if not self.users:
            self.print_colored("❌ No users available to create chatrooms", Fore.RED)
            return []
            
        self.print_colored(f"🏠 Creating {count} chatrooms...", Fore.CYAN)
        
        created_rooms = []
        for i in range(count):
            try:
                user = random.choice(self.users)
                room_name = f"TestRoom{i}_{int(time.time() * 1000) % 10000}"
                
                response = requests.post(
                    f"{BASE_URL}/api/chatrooms",
                    json={"name": room_name},
                    headers={"Authorization": f"Bearer {user['token']}"},
                    timeout=30
                )
                
                if response.status_code == 201:
                    room_data = response.json()
                    created_rooms.append(room_data)
                    self.print_colored(f"✅ Created room: {room_name}", Fore.GREEN)
                else:
                    self.print_colored(f"❌ Failed to create room: {room_name}", Fore.RED)
                    
            except Exception as e:
                self.print_colored(f"❌ Error creating room {i}: {str(e)}", Fore.RED)
                
        self.chatrooms = created_rooms
        self.print_colored(f"✅ Created {len(created_rooms)} chatrooms successfully", Fore.GREEN)
        return created_rooms
    
    def setup_socket_connections(self):
        """Setup socket connections for users"""
        if not self.users:
            self.print_colored("❌ No users available for socket connections", Fore.RED)
            return
            
        self.print_colored(f"🔌 Setting up socket connections for {len(self.users)} users...", Fore.CYAN)
        
        connected_sockets = []
        for user in self.users:
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
                sio.connect(f"{SOCKET_URL}?token={user['token']}")
                
                connected_sockets.append({
                    "socket": sio,
                    "user": user
                })
                
                self.print_colored(f"✅ Connected socket for: {user['username']}", Fore.GREEN)
                
            except Exception as e:
                self.print_colored(f"❌ Socket connection failed for {user['username']}: {str(e)}", Fore.RED)
                
        self.sockets = connected_sockets
        self.print_colored(f"✅ Connected {len(connected_sockets)} sockets successfully", Fore.GREEN)
    
    def join_chatrooms(self):
        """Join users to chatrooms"""
        if not self.sockets or not self.chatrooms:
            self.print_colored("❌ No sockets or chatrooms available", Fore.RED)
            return
            
        self.print_colored("🚪 Joining users to chatrooms...", Fore.CYAN)
        
        for socket_data in self.sockets:
            try:
                # Join random rooms
                rooms_to_join = random.sample(self.chatrooms, min(2, len(self.chatrooms)))
                for room in rooms_to_join:
                    socket_data["socket"].emit("join_room", {"roomId": room["roomId"]})
                    
                self.print_colored(f"✅ {socket_data['user']['username']} joined {len(rooms_to_join)} rooms", Fore.GREEN)
                
            except Exception as e:
                self.print_colored(f"❌ Error joining rooms for {socket_data['user']['username']}: {str(e)}", Fore.RED)
    
    def start_light_messaging(self, duration_seconds: int = 30, messages_per_second: int = 2):
        """Start light message bombing"""
        if not self.sockets or not self.chatrooms:
            self.print_colored("❌ No sockets or chatrooms available for messaging", Fore.RED)
            return
            
        self.print_colored(f"💬 Starting light messaging for {duration_seconds}s at {messages_per_second} msg/sec...", Fore.CYAN)
        
        messages = [
            "Hello everyone! 👋",
            "How is everyone doing?",
            "This is a test message 🚀",
            "Great to be here!",
            "Testing the chat system",
            "AWS deployment is working! ☁️",
            "Light load test in progress...",
            "Everything looks good! ✅"
        ]
        
        def send_messages():
            start_time = time.time()
            message_count = 0
            
            while time.time() - start_time < duration_seconds:
                try:
                    socket_data = random.choice(self.sockets)
                    room = random.choice(self.chatrooms)
                    message = random.choice(messages)
                    
                    socket_data["socket"].emit("send_message", {
                        "roomId": room["roomId"],
                        "message": message
                    })
                    
                    message_count += 1
                    
                    # Control message rate
                    time.sleep(1.0 / messages_per_second)
                    
                except Exception as e:
                    self.print_colored(f"❌ Error sending message: {str(e)}", Fore.RED)
                    
            self.print_colored(f"✅ Sent {message_count} messages in {duration_seconds}s", Fore.GREEN)
        
        # Start messaging in threads
        threads = []
        for i in range(min(3, len(self.sockets))):  # Max 3 threads
            thread = threading.Thread(target=send_messages)
            threads.append(thread)
            thread.start()
            
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
            
        self.print_colored("✅ Light messaging completed", Fore.GREEN)
    
    def cleanup(self):
        """Cleanup connections"""
        self.print_colored("🧹 Cleaning up connections...", Fore.YELLOW)
        
        for socket_data in self.sockets:
            try:
                socket_data["socket"].disconnect()
            except:
                pass
                
        self.sockets = []
        self.print_colored("✅ Cleanup completed", Fore.GREEN)
    
    def run_light_test(self, num_users: int = 5, num_chatrooms: int = 3, 
                      duration: int = 30, messages_per_second: int = 2):
        """Run complete light load test"""
        self.print_colored("🌟 Starting Light Load Test for AWS", Fore.MAGENTA)
        self.print_colored(f"📊 Configuration:", Fore.CYAN)
        self.print_colored(f"  - Users: {num_users}", Fore.CYAN)
        self.print_colored(f"  - Chatrooms: {num_chatrooms}", Fore.CYAN)
        self.print_colored(f"  - Duration: {duration}s", Fore.CYAN)
        self.print_colored(f"  - Message Rate: {messages_per_second} msg/sec", Fore.CYAN)
        
        try:
            # Step 1: Create users
            self.create_users(num_users)
            
            # Step 2: Create chatrooms
            self.create_chatrooms(num_chatrooms)
            
            # Step 3: Setup socket connections
            self.setup_socket_connections()
            
            # Step 4: Join chatrooms
            self.join_chatrooms()
            
            # Step 5: Start messaging
            self.start_light_messaging(duration, messages_per_second)
            
            self.print_colored("🎉 Light load test completed successfully!", Fore.GREEN)
            
        except Exception as e:
            self.print_colored(f"❌ Test failed: {str(e)}", Fore.RED)
        finally:
            self.cleanup()

def show_light_menu():
    """Display the light test menu"""
    print(f"\n{Fore.MAGENTA}{'='*60}")
    print(f"{Fore.MAGENTA}🌟 AWS Light Load Test Menu 🌟")
    print(f"{Fore.MAGENTA}{'='*60}{Style.RESET_ALL}")
    print(f"\n{Fore.CYAN}Select test level:")
    print(f"{Fore.YELLOW}1. 🚀 Micro Test (3 users, 2 rooms, 30s) - 1 msg/sec")
    print(f"{Fore.YELLOW}2. 📱 Light Test (5 users, 3 rooms, 60s) - 2 msg/sec")
    print(f"{Fore.YELLOW}3. 💻 Medium Test (10 users, 5 rooms, 120s) - 3 msg/sec")
    print(f"{Fore.YELLOW}4. 🎯 Custom Test")
    print(f"{Fore.RED}0. Exit")
    print(f"{Style.RESET_ALL}")

def main():
    """Main function"""
    while True:
        show_light_menu()
        
        try:
            choice = input(f"{Fore.GREEN}Select your choice (0-4): {Style.RESET_ALL}").strip()
            
            if choice == "0":
                print(f"{Fore.MAGENTA}👋 Goodbye!{Style.RESET_ALL}")
                break
            
            load_test = LightLoadTest()
            
            if choice == "1":
                # Micro test
                print(f"\n{Fore.CYAN}🚀 Starting Micro Test...")
                load_test.run_light_test(3, 2, 30, 1)
                
            elif choice == "2":
                # Light test
                print(f"\n{Fore.CYAN}📱 Starting Light Test...")
                load_test.run_light_test(5, 3, 60, 2)
                
            elif choice == "3":
                # Medium test
                print(f"\n{Fore.CYAN}💻 Starting Medium Test...")
                load_test.run_light_test(10, 5, 120, 3)
                
            elif choice == "4":
                # Custom test
                try:
                    users = int(input(f"{Fore.YELLOW}Number of users (1-20): ") or "5")
                    rooms = int(input(f"{Fore.YELLOW}Number of rooms (1-10): ") or "3")
                    duration = int(input(f"{Fore.YELLOW}Duration in seconds (10-300): ") or "60")
                    msg_rate = int(input(f"{Fore.YELLOW}Messages per second (1-10): ") or "2")
                    
                    users = min(max(users, 1), 20)
                    rooms = min(max(rooms, 1), 10)
                    duration = min(max(duration, 10), 300)
                    msg_rate = min(max(msg_rate, 1), 10)
                    
                    print(f"\n{Fore.CYAN}🎯 Starting Custom Test...")
                    load_test.run_light_test(users, rooms, duration, msg_rate)
                    
                except ValueError:
                    print(f"{Fore.RED}Invalid input. Using default values.{Style.RESET_ALL}")
                    load_test.run_light_test(5, 3, 60, 2)
                    
            else:
                print(f"{Fore.RED}Invalid choice. Please select again.{Style.RESET_ALL}")
                continue
            
            # Wait for user input before showing menu again
            input(f"\n{Fore.YELLOW}Press Enter to return to menu...{Style.RESET_ALL}")
            
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}⚠️ User interrupted.{Style.RESET_ALL}")
            break
        except Exception as e:
            print(f"{Fore.RED}❌ Error occurred: {str(e)}{Style.RESET_ALL}")
            input(f"\n{Fore.YELLOW}Press Enter to continue...{Style.RESET_ALL}")

if __name__ == "__main__":
    main() 
