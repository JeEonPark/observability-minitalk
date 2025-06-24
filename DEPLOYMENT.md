# MiniTalk Deployment Guide

This guide will help you deploy the MiniTalk application to Amazon EKS using GitHub Actions, ArgoCD, and GitHub Container Registry (GHCR).

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **AWS EKS Cluster**: Already configured (`training-cluster-2025`)
3. **ArgoCD**: Already installed in your cluster
4. **Datadog**: Already configured for monitoring

## Setup Instructions

### 1. GitHub Repository Setup

1. **Update GitHub Repository URL**:
   - Edit `argocd-app-jonny.yaml`
   - Replace `https://github.com/JeEonPark/observability-minitalk.git` with your actual repository URL

2. **Update Image Names**:
   - Edit `k8s/overlays/jonny/backend-patch.yaml`
   - Edit `k8s/overlays/jonny/frontend-patch.yaml`
   - Replace `ghcr.io/your-username/minitalk/` with your actual GitHub username

3. **Setup Secrets**:
   ```bash
   # Copy example secret file and generate secure JWT secret
   cp k8s/overlays/jonny/secret.yaml.example k8s/overlays/jonny/secret.yaml
   openssl rand -base64 64  # Use this output to replace REPLACE_WITH_SECURE_RANDOM_STRING
   ```

### 2. GitHub Secrets Configuration

Add these secrets to your GitHub repository:

```bash
# Go to Settings > Secrets and variables > Actions
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

### 3. GHCR Permissions

1. Go to your GitHub repository settings
2. Navigate to "Actions" > "General"
3. Under "Workflow permissions", select "Read and write permissions"
4. Check "Allow GitHub Actions to create and approve pull requests"

### 4. Deploy to Kubernetes

#### Option A: Using GitHub Actions (Recommended)

1. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Build Docker images
   - Push to GHCR
   - Update Kubernetes manifests
   - Deploy via ArgoCD

#### Option B: Manual Deployment

1. **Build and Push Images**:
   ```bash
   # Login to GHCR
   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
   
   # Build and push backend
   docker build -t ghcr.io/your-username/minitalk/backend:latest ./backend
   docker push ghcr.io/your-username/minitalk/backend:latest
   
   # Build and push frontend
   docker build -t ghcr.io/your-username/minitalk/frontend:latest ./frontend
   docker push ghcr.io/your-username/minitalk/frontend:latest
   ```

2. **Deploy ArgoCD Application**:
   ```bash
   kubectl apply -f argocd-app-jonny.yaml
   ```

### 5. Verify Deployment

1. **Check ArgoCD Application**:
   ```bash
   kubectl get applications -n argocd
   kubectl get application minitalk-jonny -n argocd -o yaml
   ```

2. **Check Pods in jonny namespace**:
   ```bash
   kubectl get pods -n jonny
   kubectl get services -n jonny
   ```

3. **Check Application Logs**:
   ```bash
   kubectl logs -n jonny deployment/backend-deployment
   kubectl logs -n jonny deployment/frontend-deployment
   ```

### 6. Access Your Application

1. **Port Forward (for testing)**:
   ```bash
   kubectl port-forward -n jonny service/frontend-service 8080:80
   ```
   Then visit: http://localhost:8080

2. **Configure Ingress** (for production):
   - Update the hostname in `k8s/overlays/jonny/frontend-patch.yaml`
   - Configure your DNS to point to the ingress controller

### 7. Monitoring with Datadog

Your application is already configured with Datadog monitoring:

- **Metrics**: Automatically collected from pods
- **Traces**: APM tracing enabled
- **Logs**: Container logs collected
- **Custom Metrics**: Use the DogStatsD service on port 8125

### 8. Updating the Application

To update your application:

1. Make code changes
2. Push to the `main` branch
3. GitHub Actions will automatically build new images and deploy

Or manually sync ArgoCD:
```bash
kubectl patch application minitalk-jonny -n argocd -p '{"operation":{"sync":{"revision":"HEAD"}}}' --type merge
```

## Application Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     Frontend        │    │      Backend        │    │      MongoDB        │
│   (React + nginx)   │───▶│   (Node.js + WS)    │───▶│     (Database)      │
│     Port: 80        │    │     Port: 4000      │    │     Port: 27017     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────────┐
                              │     Datadog         │
                              │   (Monitoring)      │
                              │  Metrics & Traces   │
                              └─────────────────────┘
```

## Troubleshooting

### Common Issues

1. **Image Pull Errors**:
   - Verify GHCR permissions
   - Check image names in manifests

2. **ArgoCD Sync Issues**:
   - Check repository URL
   - Verify branch name (HEAD/main)

3. **Pod Startup Issues**:
   - Check resource limits
   - Verify environment variables
   - Check MongoDB connectivity

4. **Service Discovery Issues**:
   - Verify service names match
   - Check namespace configuration

### Debug Commands

```bash
# Check ArgoCD application status
kubectl describe application minitalk-jonny -n argocd

# Check pod events
kubectl describe pod -n jonny -l app=backend

# Check service endpoints
kubectl get endpoints -n jonny

# Check ingress status
kubectl describe ingress -n jonny

# View application logs
kubectl logs -n jonny -f deployment/backend-deployment
```

## Security Considerations

1. **Secrets Management**: Update default passwords in production
2. **Network Policies**: Consider implementing network policies
3. **RBAC**: Review and implement proper RBAC rules
4. **Image Security**: Regularly update base images and scan for vulnerabilities

## Scaling

The application is configured with:
- **Backend**: 3 replicas
- **Frontend**: 3 replicas
- **MongoDB**: 1 replica (consider StatefulSet for production)

To scale:
```bash
kubectl scale deployment backend-deployment -n jonny --replicas=5
kubectl scale deployment frontend-deployment -n jonny --replicas=5
``` 
 