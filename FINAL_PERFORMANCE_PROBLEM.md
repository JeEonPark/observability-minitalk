# 🚀 Final Performance Challenge: Message Processing Optimization

## 📋 Problem Description

You are a backend developer for the MinitalkChat application.
As December 31st approaches, you need to optimize performance to handle the large volume of messages that will be sent for New Year greetings.

## 🎯 Challenge Objectives

1. **Identify Current Problems**: Confirm performance issues with large message load testing
2. **Backend Optimization**: Improve message processing performance
3. **Verify Improvement Effects**: Confirm that message transmission works normally in the frontend

## 📊 Step 1: Current Performance Check

### Execute Large Message Load Test
```bash
kubectl exec -it minitalk-loadtest-7fdc87d54-45sqp -n jonny -- python new_year_load_test.py
```
The identifier after minitalk-loadtest may change, so use tab for auto-completion.

Note: The performance of this EKS environment is not very good, so the load test will run with lower numbers than actual performance.
Only run the 1. Quick Bombing load test.

### Check in Frontend
1. Access MinitalkChat in browser
2. Try sending messages in chat room
3. **Identify Problems**: Observe message delays or transmission failures

## 🔧 Step 2: Backend Optimization

### Optimization Goals
- Prevent message transmission failures
- Reduce message transmission delays

### Constraints
- No frontend modifications allowed
- Ensure data integrity
- Maintain existing functionality

## ✅ Step 3: Verify Improvement Effects

### Re-run Large Message Load Test
```bash
kubectl exec -it minitalk-loadtest-7fdc87d54-45sqp -n jonny -- python new_year_load_test.py
```

### Re-check Frontend
1. Access MinitalkChat in browser
2. Try sending messages in chat room
3. **Verify Improvement**: Check if messages are sent normally

## ✅ Completion Criteria

- [ ] Confirm current performance issues with large message load test
- [ ] Implement backend optimization
- [ ] Verify improvement effects in large message load test
- [ ] Confirm normal message transmission in frontend

**Good Luck! 🚀** 
