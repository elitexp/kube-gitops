#!/bin/bash

echo "Uninstalling MinIO storage..."

kubectl delete -f service.yaml
kubectl delete -f deployment.yaml
kubectl delete -f secret.yaml

echo "MinIO storage uninstalled successfully!"

