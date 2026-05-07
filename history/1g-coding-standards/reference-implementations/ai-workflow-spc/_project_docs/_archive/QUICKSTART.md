# Quick Start Guide - AI Workflow SPC Platform

## 🚀 Get Started in 2 Minutes

### Step 1: Install Dependencies
```bash
# Navigate to project directory
cd /mnt/c/Users/Chris/Documents/_DevProjects/ai-workflow-spc

# Install minimal dependencies (if not in venv)
pip3 install fastapi uvicorn pydantic httpx
```

### Step 2: Start the Server
```bash
# Run the platform
./run.sh

# Or run directly
python3 src/main.py
```

### Step 3: Open the QC Interface
Open `frontend/index.html` in your web browser
- File path: `C:\Users\Chris\Documents\_DevProjects\ai-workflow-spc\frontend\index.html`
- Or navigate to: `file:///C:/Users/Chris/Documents/_DevProjects/ai-workflow-spc/frontend/index.html`

### Step 4: Test It Out
In a new terminal:
```bash
# Test the API
python3 test_api.py

# Run the progressive sampling demo
python3 demo_progressive_sampling.py
```

## 💡 What You'll See

1. **Progressive Sampling in Action**:
   - First 10 tasks: 100% require QC
   - After 30 tasks with good quality: ~10% require QC
   - After 50+ tasks: Only 5% require QC
   - **Result**: 95% cost savings!

2. **Real-time Statistics**:
   - Watch sampling rates drop in real-time
   - See process capability (Cpk) improve
   - Track actual cost savings percentage

3. **A/B Testing**:
   - Compare DALL-E vs Stable Diffusion
   - Automatic winner detection
   - Statistical significance calculation

## 📊 Key Metrics to Watch

- **Sampling Rate**: Should drop from 100% → 5% as quality proves stable
- **Process Capability (Cpk)**: Target is ≥ 1.33 for "capable" processes
- **Cost Savings**: Shows percentage of QC work eliminated
- **Pass Rate**: Should stay above 95% even with reduced sampling

## 🔧 Troubleshooting

1. **"Module not found" error**: Install dependencies with `pip3 install -r requirements-minimal.txt`
2. **"Connection refused"**: Make sure the API server is running on port 8000
3. **Web UI not updating**: Refresh the page or check browser console for errors

## 🎯 Demo Talking Points

When demonstrating this platform:

1. **The Problem**: "Human QC is expensive and doesn't scale with AI"
2. **The Solution**: "Apply manufacturing quality control principles to AI"
3. **The Result**: "95% reduction in QC costs while maintaining quality"
4. **The Innovation**: "First platform to make AI workflows self-optimizing"

## 📈 Next Steps

Once the MVP is running:

1. **Add Real Image Generation**: Integrate actual DALL-E or Stable Diffusion
2. **Add Persistence**: SQLite database for production use
3. **Deploy to Cloud**: Dockerize and deploy to AWS/GCP
4. **Scale Up**: Add Redis for queuing, Celery for distributed processing

---

**Ready to revolutionize AI quality control? Let's go! 🚀**