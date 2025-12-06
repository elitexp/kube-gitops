#!/bin/bash

echo "Installing MinIO storage..."

kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

echo "MinIO storage installed successfully!"
echo "MinIO API endpoint: minio:9000"
echo "MinIO Console: minio:9001"

