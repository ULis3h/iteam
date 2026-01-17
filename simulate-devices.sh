#!/bin/bash

# Device IDs
MACBOOK_PRO="8d6e5c3d-6b58-4c00-b0ac-1eb6c8f1d475"
UBUNTU_DEV="14ed8e25-9920-49e4-b88c-14ddb78c9652"
WIN_WORKSTATION="0d89f930-353f-4dff-b7f3-fec1d7cab1e0"
MAC_MINI="9a71fb85-81bc-4b82-b8b0-ef737c8ab299"

API_URL="http://localhost:3000/api/devices"

echo "Starting device simulation... Press Ctrl+C to stop."

while true; do
    echo "Sending heartbeats with hardware info..."

    # Generate random usage values
    CPU1=$((RANDOM % 40 + 30))  # 30-70%
    CPU2=$((RANDOM % 50 + 40))  # 40-90%
    CPU3=$((RANDOM % 30 + 10))  # 10-40%
    CPU4=$((RANDOM % 25 + 5))   # 5-30%
    
    MEM1=$((RANDOM % 30 + 50))  # 50-80%
    MEM2=$((RANDOM % 40 + 40))  # 40-80%
    MEM3=$((RANDOM % 30 + 30))  # 30-60%
    MEM4=$((RANDOM % 20 + 40))  # 40-60%
    
    DISK1=$((RANDOM % 10 + 60)) # 60-70%
    DISK2=$((RANDOM % 10 + 45)) # 45-55%
    DISK3=$((RANDOM % 10 + 70)) # 70-80%
    DISK4=$((RANDOM % 10 + 30)) # 30-40%
    
    GPU1=$((RANDOM % 30 + 20))  # 20-50%
    GPU2=$((RANDOM % 60 + 30))  # 30-90%
    GPU3=$((RANDOM % 20 + 0))   # 0-20%
    GPU4=$((RANDOM % 15 + 5))   # 5-20%

    # API Key for device authentication
    API_KEY="iteam-device-key"

    # MacBook Pro - 前端开发 (Frontend Developer)
    curl -s -X PUT "$API_URL/$MACBOOK_PRO" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{\"status\": \"working\", \"role\": \"frontend\", \"metadata\": {\"cpu\": \"Apple M3 Max\", \"cpuCores\": 16, \"cpuUsage\": $CPU1, \"memory\": \"64GB Unified Memory\", \"memoryUsage\": $MEM1, \"gpu\": \"Apple M3 Max (40-core GPU)\", \"gpuMemory\": \"64GB (共享)\", \"gpuUsage\": $GPU1, \"disk\": \"Apple SSD 2TB\", \"diskUsage\": $DISK1, \"diskTotal\": \"2TB\", \"diskUsed\": \"1.3TB\", \"hostname\": \"Macbook-Pro-Developer\", \"uptime\": 345600, \"version\": \"1.2.0\"}}" > /dev/null

    # Ubuntu Dev - 后端开发 (Backend Developer)
    curl -s -X PUT "$API_URL/$UBUNTU_DEV" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{\"status\": \"working\", \"role\": \"backend\", \"metadata\": {\"cpu\": \"AMD Ryzen 9 7950X\", \"cpuCores\": 16, \"cpuUsage\": $CPU2, \"memory\": \"128GB DDR5\", \"memoryUsage\": $MEM2, \"gpu\": \"NVIDIA RTX 4090\", \"gpuMemory\": \"24GB GDDR6X\", \"gpuUsage\": $GPU2, \"disk\": \"Samsung 990 Pro 4TB\", \"diskUsage\": $DISK2, \"diskTotal\": \"4TB\", \"diskUsed\": \"1.8TB\", \"hostname\": \"ubuntu-dev-workstation\", \"uptime\": 1209600, \"version\": \"1.2.0\"}}" > /dev/null

    # Windows Workstation - DevOps工程师
    curl -s -X PUT "$API_URL/$WIN_WORKSTATION" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{\"status\": \"online\", \"role\": \"devops\", \"metadata\": {\"cpu\": \"Intel Core i9-14900K\", \"cpuCores\": 24, \"cpuUsage\": $CPU3, \"memory\": \"64GB DDR5\", \"memoryUsage\": $MEM3, \"gpu\": \"NVIDIA RTX 4080\", \"gpuMemory\": \"16GB GDDR6X\", \"gpuUsage\": $GPU3, \"disk\": \"Samsung 980 Pro 2TB\", \"diskUsage\": $DISK3, \"diskTotal\": \"2TB\", \"diskUsed\": \"1.5TB\", \"hostname\": \"WIN-WORKSTATION-01\", \"uptime\": 518400, \"version\": \"1.1.5\"}}" > /dev/null

    # Mac Mini - 项目经理 (Project Manager)
    curl -s -X PUT "$API_URL/$MAC_MINI" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{\"status\": \"online\", \"role\": \"pm\", \"metadata\": {\"cpu\": \"Apple M2 Pro\", \"cpuCores\": 12, \"cpuUsage\": $CPU4, \"memory\": \"32GB Unified Memory\", \"memoryUsage\": $MEM4, \"gpu\": \"Apple M2 Pro (19-core GPU)\", \"gpuMemory\": \"32GB (共享)\", \"gpuUsage\": $GPU4, \"disk\": \"Apple SSD 1TB\", \"diskUsage\": $DISK4, \"diskTotal\": \"1TB\", \"diskUsed\": \"350GB\", \"hostname\": \"Mac-Mini-Server\", \"uptime\": 2592000, \"version\": \"1.2.0\"}}" > /dev/null

    echo "Heartbeats sent with hardware info. Waiting 60s..."
    sleep 60
done
