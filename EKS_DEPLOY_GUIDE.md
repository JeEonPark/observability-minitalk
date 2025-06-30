# EKS Deployment Guide (Problem & Answer Version)

This guide explains how to deploy both the problem (`final-issue-problem`) and answer (`final-issue-answer`) versions of the backend to AWS EKS.

---

## 1. Checkout the Branch

- **Problem Version:**
  ```sh
  git checkout final-issue-problem
  ```
- **Answer Version:**
  ```sh
  git checkout final-issue-answer
  ```

## 2. Build Docker Image

- **Problem Version:**
  ```sh
  docker build -t ghcr.io/jeeonpark/minitalk-backend:final-issue-problem ./backend
  ```
- **Answer Version:**
  ```sh
  docker build -t ghcr.io/jeeonpark/minitalk-backend:final-issue-answer ./backend
  ```

## 3. Push Docker Image to GHCR

- **Problem Version:**
  ```sh
  docker push ghcr.io/jeeonpark/minitalk-backend:final-issue-problem
  ```
- **Answer Version:**
  ```sh
  docker push ghcr.io/jeeonpark/minitalk-backend:final-issue-answer
  ```

## 4. Edit Kubernetes Deployment YAML

Edit `k8s/backend-deployment-aws.yaml`:

- **Problem Version:**
  ```yaml
  image: ghcr.io/jeeonpark/minitalk-backend:final-issue-problem
  ```
- **Answer Version:**
  ```yaml
  image: ghcr.io/jeeonpark/minitalk-backend:final-issue-answer
  ```

## 5. Apply Deployment to EKS

- **Problem Version:**
  ```sh
  kubectl apply -f k8s/backend-deployment-aws.yaml -n jonny
  ```
- **Answer Version:**
  ```sh
  kubectl apply -f k8s/backend-deployment-aws.yaml -n jonny
  ```

## 6. Check Deployment Status

```sh
kubectl get pods -n jonny
```

---

Repeat the above steps to switch between problem and answer versions as needed. 
