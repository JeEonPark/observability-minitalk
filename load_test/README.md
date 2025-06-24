# New Year Chat Load Test

This Python script generates massive amounts of chat data for New Year celebrations, specifically designed to test chat applications under extreme load conditions.

## Features

- **Mass User Creation**: Creates thousands of unique users with timestamped usernames
- **New Year Themed Chatrooms**: Creates festive chatrooms with celebration themes
- **Real-time WebSocket Connections**: Establishes concurrent socket connections for real-time messaging
- **Celebration Message Bombing**: Sends massive amounts of New Year celebration messages in English
- **Colorful Terminal Output**: Beautiful colored progress tracking and statistics
- **Interactive Menu System**: Single file with multiple test configurations

## Requirements

Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

Simply run the main script:

```bash
python new_year_load_test.py
```

### Menu Options

The script provides an interactive menu with the following options:

1. **🚀 Quick Test** - 30 users, 10 rooms, 30 seconds
2. **🏃 Medium Test** - 100 users, 15 rooms, 60 seconds  
3. **💪 Strong Test** - 500 users, 20 rooms, 120 seconds
4. **🔥 Extreme Test** - 1000 users, 25 rooms, 180 seconds
5. **🌟 Mega Test** - 5000 users, 30 rooms, 300 seconds
6. **🚀 Ultra Test** - 10000 users, 35 rooms, 600 seconds
7. **🎯 Custom Settings** - Configure your own parameters
8. **🧪 Connection Test Only** - Test user creation and connections without messaging

## Configuration

The script uses the following default settings:

- **Base URL**: `http://127.0.0.1:4000`
- **Socket URL**: `http://127.0.0.1:4000`
- **Parallel Workers**: Up to 1000 concurrent operations
- **Batch Processing**: 2000 users per batch for optimal performance

## New Year Messages

The script sends authentic English New Year celebration messages including:

- 🎉 Happy New Year everyone! 🎉
- 🎊 Wishing you all a fantastic 2024! 🎊
- 🥳 Cheers to new beginnings!
- ✨ May this year be filled with joy and success! ✨
- 🎆 Happy New Year! Let's make it amazing! 🎆

And many more festive messages!

## Performance Features

- **Ultra-fast User Registration**: Minimal delays between operations
- **Parallel Processing**: Concurrent user creation and socket connections
- **Batch Operations**: Efficient batch processing for large-scale tests
- **Connection Pooling**: Optimized network connections
- **Atomic Operations**: Thread-safe file operations to prevent race conditions

## Technical Details

- **Thread-safe Operations**: Backend supports concurrent user creation
- **Race Condition Prevention**: Queue-based file operations
- **Network Optimization**: Connection pooling and retry strategies
- **Memory Efficient**: Batch processing to handle millions of users
- **Real-time Statistics**: Live progress tracking and performance metrics

## Troubleshooting

1. **Connection Issues**: The script uses `127.0.0.1` instead of `localhost` to avoid DNS issues
2. **Authentication**: Socket connections use query parameter authentication (`?token=...`)
3. **Rate Limiting**: Adjust delays in the script if you encounter rate limiting
4. **Memory Usage**: For very large tests (50M+ users), consider running in smaller batches

## Files

- `new_year_load_test.py` - Main script with interactive menu
- `requirements.txt` - Python dependencies
- `file_lock_fix.js` - Backend fix for race conditions (if needed)
- `README.md` - This documentation

## Example Output

```
🎊🎉 NEW YEAR CHAT LOAD TEST 🎉🎊
============================================================

Please select a test option:
1. 🚀 Quick Test (30 users, 10 rooms, 30 seconds)
2. 🏃 Medium Test (100 users, 15 rooms, 60 seconds)
...

🚀 Creating 100 users in parallel batches...
✅ Created user: NewYearParty123_456789_abc12345_7890_Star
🎉 Connected 95 socket connections in parallel!
🎊🎉 STARTING NEW YEAR CELEBRATION! 🎉🎊
📊 Sent 1000 messages (25.3/sec)
```

## Notes

- Designed for testing chat applications under extreme load
- Supports up to 50 million users with proper configuration
- All messages are in English for international compatibility
- Optimized for maximum performance and minimal resource usage
 