# Deployment Guide

## Problem Version Deployment

### 1. Build and Push Image
```bash
docker build -t ghcr.io/jeeonpark/minitalk-backend:final-issue-problem ./backend
docker push ghcr.io/jeeonpark/minitalk-backend:final-issue-problem
```

### 2. Deploy to EKS
```bash
kubectl set image deployment/minitalk-backend backend=ghcr.io/jeeonpark/minitalk-backend:final-issue-problem -n jonny
kubectl rollout status deployment/minitalk-backend -n jonny
```

## Solution Version Deployment

### 1. Build and Push Image
```bash
docker build -t ghcr.io/jeeonpark/minitalk-backend:final-issue-answer ./backend
docker push ghcr.io/jeeonpark/minitalk-backend:final-issue-answer
```

### 2. Deploy to EKS
```bash
kubectl set image deployment/minitalk-backend backend=ghcr.io/jeeonpark/minitalk-backend:final-issue-answer -n jonny
kubectl rollout status deployment/minitalk-backend -n jonny
```

## Check Deployment Status
```bash
kubectl get pods -n jonny -l app=minitalk-backend
``` 
