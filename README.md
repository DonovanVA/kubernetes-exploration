# Interview-task
## Install minikube

#### 1. Kubernetes Deployment:
``` bash
kubectl apply -f ./deployments/config-map.yaml
kubectl apply -f ./deployments/secrets.yaml
```

#### 2. CI/CD Integration:
This workflow is suitable for Azure kubernetes service (AKS) using Azure service principal
the following workflow is triggered on commit to `main` branch:
repository secrets required:
DOCKER_USERNAME - username of your docker account (donnyvan)
DOCKER_PASSWORD - password of your docker account
KUBE_CREDENTIALS_CLIENTID: Azure service principal client ID
KUBE_CREDENTIALS_CLIENTSECRET: Azure service principal client secret
KUBE_CREDENTIALS_TENANTID: Azure tenant ID
KUBE_CREDENTIALS_SUBSCRIPTIONID: Azure subscription ID

1. 00-retrieves-secrets.yaml storing all the secrets
2. 01-docker-build-push.yaml to build and push images to dockerhub 
3. 02-apply-deploy.yaml to apply the kubernetes configurations in `/deployments` folder:
    - config-map.yaml
    - secrets.yaml
    - auto-deploy.yaml

#### 3. Monitoring setup:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack \
  --create-namespace \
  --namespace kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack
kubectl port-forward -n kube-prometheus-stack svc/kube-prometheus-stack-prometheus 9090:9090
kubectl port-forward -n kube-prometheus-stack svc/kube-prometheus-stack-grafana 8080:80
```
grafana credentials:
username: admin
pw: prom-operator



