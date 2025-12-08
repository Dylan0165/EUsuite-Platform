# CI/CD Build & Deploy Instructies

## GitLab CI/CD (Voorbeeld)

Maak een `.gitlab-ci.yml` bestand:

```yaml
stages:
  - build
  - deploy

variables:
  DOCKER_IMAGE: your-registry/eusuite-dashboard
  DOCKER_TAG: $CI_COMMIT_SHORT_SHA

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $DOCKER_IMAGE:$DOCKER_TAG .
    - docker tag $DOCKER_IMAGE:$DOCKER_TAG $DOCKER_IMAGE:latest
    - docker push $DOCKER_IMAGE:$DOCKER_TAG
    - docker push $DOCKER_IMAGE:latest
  only:
    - main

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context your-k8s-context
    - kubectl set image deployment/eusuite-dashboard dashboard=$DOCKER_IMAGE:$DOCKER_TAG -n default
    - kubectl rollout status deployment/eusuite-dashboard -n default
  only:
    - main
```

## GitHub Actions (Voorbeeld)

Maak een `.github/workflows/deploy.yml` bestand:

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Login to Docker Registry
      uses: docker/login-action@v2
      with:
        registry: your-registry
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and Push Docker Image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          your-registry/eusuite-dashboard:${{ github.sha }}
          your-registry/eusuite-dashboard:latest
    
    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v4
      with:
        manifests: |
          k8s/deployment.yaml
        images: |
          your-registry/eusuite-dashboard:${{ github.sha }}
        kubectl-version: 'latest'
```

## Setup Secrets

Voeg de volgende secrets toe aan je Git repository:

- `DOCKER_USERNAME`: Docker registry gebruikersnaam
- `DOCKER_PASSWORD`: Docker registry wachtwoord
- Kubernetes config/credentials (afhankelijk van je setup)
