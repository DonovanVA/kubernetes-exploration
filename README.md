# Kubernetes Demo
## Pre-requisite: Install minikube for local testing of Task 1 and Task 3
The following local minikube must be installed on an amd64 architecture device, to follow and standardize the same architecture across Azure and github actions (github actions build images using amd64) or you would be getting ImagePullBackoff error

Checkout how to install minikube for local cluster (Preferrably windows OS):
https://minikube.sigs.k8s.io/docs/start/?arch=%2Fmacos%2Farm64%2Fstable%2Fbinary+download

* Ensure that your Docker Daemon is also installed and running from https://www.docker.com/products/docker-desktop/, then run the following command to start the clusterm this will also enable the `kubectl` CLI:
* Also ensure that helm is installed: https://helm.sh/docs/intro/install/

Architecture Diagram:

<img width="602" alt="Screenshot 2024-11-02 at 11 46 37 AM" src="https://github.com/user-attachments/assets/357bc92c-70e5-4e98-9fb0-7103298e17e9">

1. Install nginx
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```
2. Start minikube
```bash
minikube start
```
*if an error occurs or if you have previously ran a cluster, run `minikube delete`, then `minikube start` 

3. Install and view the minikube kubectl CLI:
```bash
minikube kubectl -- get po -A
```
4. Enable ingress addon:
```bash
minikube addons enable ingress
minikube addons enable ingress-dns
```

## Task 1: Kubernetes Deployment:
(Method 1) Run the following set of commands to launch deployment of deployment, service, configMap, secrets and ingress
``` bash
kubectl apply -f ./deployments/config-map.yaml
kubectl apply -f ./deployments/secrets.yaml
kubectl apply -f ./deployments/manual-deploy.yaml
```
Expose the service via portforwarding:
```bash
kubectl port-forward service/interview-app-service 5000:80
```
You can now check in `http://localhost:5000`:

![Screenshot 2024-10-07 051955](https://github.com/user-attachments/assets/b621bfbd-fdd7-419f-9d79-d6d051c703bc)

The deployment above also has a rolling update strategy and a horizontal autoscaler if more than 70% of CPU is utilised

*Path-based routing via ingress is possible through a fully qualified domain name (FQDN), the route configured here is "/interview-app"

## Task 2: CI/CD Integration:
(Method 2) This workflow is suitable for Azure kubernetes service (AKS) using Azure service principal (Unforunately, I do not have access to an AKS at the moment, the current secrets are dummy secrets)
the following workflow is triggered on commit to `main` branch using Github actions:
These are the repository secrets required under `settings` -> `Secrets and Variables` -> `Actions` -> `Repository Secrets`:
- `DOCKER_USERNAME` - username of your docker account (donnyvan)
- `DOCKER_PASSWORD` - password of your docker account
- `KUBE_CREDENTIALS_CLIENTID`: Azure service principal client ID
- `KUBE_CREDENTIALS_CLIENTSECRET`: Azure service principal client secret
- `KUBE_CREDENTIALS_TENANTID`: Azure tenant ID
- `KUBE_CREDENTIALS_SUBSCRIPTIONID`: Azure subscription ID

Additionally, you have to enable the workflow to read and write files under `repo` -> `settings` -> `Actions` -> `General` -> `Workflow permissions` -> `Read and Write permissions` to trigger cross-repository dispatch since the CI/CD workflow has to be triggered sequentially whenever there is a commit to `main`, here is a quick overview of the workflow:
1. `00-retrieves-secrets.yaml` storing all the secrets
2. `01-docker-build-push.yaml` to build and push images to dockerhub 
3. `02-apply-deploy.yaml` to apply the kubernetes configurations in `/deployments` folder:
    - `config-map.yaml`
    - `secrets.yaml`
    - `auto-deploy.yaml`

## Task 3: Monitoring setup:
### Default prometheus and grafana for latency:
This is the default prometheus and grafana stack which has almost all the necessary metrics by default

1. Install kube-prometheus-stack using helm
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack \
  --create-namespace \
  --namespace kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack
```
2. Port forward the prometheus and grafana services from the kube-prometheus-stack:
```bash
kubectl port-forward -n kube-prometheus-stack svc/kube-prometheus-stack-prometheus 9090:9090
kubectl port-forward -n kube-prometheus-stack svc/kube-prometheus-stack-grafana 8080:80
```
prometheus will be found on: `http://localhost:9090` and grafana will be found on `http://localhost:8080`

3. Login to grafana using the default grafana credentials
default grafana credentials:
- username: admin
- pw: prom-operator

prometheus will extract metrics from the application, and then grafana will interface it and retrieve the metrics.
in grafana:
`Dashboard` -> `New dashboard` -> `Data Source` -> `Prometheus`

Here is a quick glance at the default metrics:

![Screenshot 2024-10-07 043910](https://github.com/user-attachments/assets/c9d5ef69-9621-4698-9a91-547c4ef0bd4b)
CPU: container_cpu_usage_seconds_total (total CPU usage)

![Screenshot 2024-10-07 043920](https://github.com/user-attachments/assets/26ca36fc-539a-4f84-b9e8-630e5414eef9)
Memory: container_memory_usage_bytes (Memory usage in bytes)

### Custom prometheus and grafana for latency:

If you want additional custom metrics, you can code out the nodejs server to query for other metrics such as latency. 
The current container at `donnyvan/interview-app:latest` is already able to query the duration of https requests and stores them as a histogram, and can be queried by prometheus using the `prom-client`
You can see the code in server.js

1. Create namespaces for grafana, prometheus and monitoring
```bash
kubectl create namespace grafana
kubectl create namespace prometheus
kubectl create namespace monitoring
```
change the ip addresses of your internal services in prometheus.yml:

![Screenshot 2024-10-08 182048](https://github.com/user-attachments/assets/69792d54-0e89-43f2-b51e-96905eb38c84)

The ip addresses should come together when you create the service it is the `CLUSTER-IP`. If it has no `CLUSTER-IP` then the minikube ip address must be used, which can be queries by `minikube ip`

2. Apply the configurations files
```bash
kubectl apply -f ./monitoring
```
3. Port forward the prometheus and grafana monitoring services
```bash
kubectl port-forward -n prometheus svc/prometheus-service 9090:9090
kubectl port-forward -n grafana svc/grafana-service 8080:3000
```

`Home` -> `Connections` -> `Data sources` -> Under prometheus server URL add:`http://prometheus-service.prometheus.svc.cluster.local:9090`
The `Dashboards` -> `Create visualisation` -> `Prometheus` 
Then under metrics you can query for the histogram latency by typing:
`sum(rate(http_requests_total[1m]))`

![Screenshot 2024-10-08 181718](https://github.com/user-attachments/assets/61f7b8bb-686f-40d6-815a-905a9a51447a)
Latency: histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le))
