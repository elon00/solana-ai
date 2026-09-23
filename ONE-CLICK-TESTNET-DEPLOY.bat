@echo off
setlocal
title Solana AI - One Click Testnet Deploy

echo ============================================================
echo Solana AI - One Click Solana Testnet Redeploy
echo Repo: https://github.com/elon00/solana-ai
echo Program: Bnpd9YGaVxMAwdxFoVA3SQP1Vhfwv7jnJ67QNcyAVKq3
echo ============================================================
echo.

where gh >nul 2>nul
if errorlevel 1 (
  echo ERROR: GitHub CLI ^(gh^) is not installed or not in PATH.
  echo Install GitHub CLI, sign in, then run this file again.
  pause
  exit /b 1
)

gh auth status >nul 2>nul
if errorlevel 1 (
  echo GitHub CLI is not signed in.
  echo Starting login...
  gh auth login
  if errorlevel 1 (
    echo ERROR: GitHub login failed.
    pause
    exit /b 1
  )
)

echo Triggering verified Solana Testnet deployment...
gh workflow run "Solana Testnet Deployment" --repo elon00/solana-ai -f deploy=true
if errorlevel 1 (
  echo ERROR: Could not trigger the deployment workflow.
  pause
  exit /b 1
)

echo.
echo Deployment was requested successfully.
echo Opening GitHub Actions so you can see the live run and its transaction hash...
start "" "https://github.com/elon00/solana-ai/actions/workflows/solana-testnet-deploy.yml"

echo.
echo Current live Program:
echo https://explorer.solana.com/address/Bnpd9YGaVxMAwdxFoVA3SQP1Vhfwv7jnJ67QNcyAVKq3?cluster=testnet
echo.
pause
endlocal
