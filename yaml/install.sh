#!/bin/bash
pushd database
./install.sh
popd

pushd backend
./install.sh
popd

pushd frontend
./install.sh
popd

kubectl apply -f ingress_ssl_traefik.yaml
# kubectl apply -f ingress.yaml