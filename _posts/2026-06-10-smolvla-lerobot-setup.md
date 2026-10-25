---
title: "SmolVLA setup: LeRobot, Conda and Genesis on WSL2"
tags: [smolvla, lerobot, conda, setup]
skills: [Linux, Python]
---

My notes on setting up LeRobot and SmolVLA with Conda on WSL2, and on getting the Genesis simulator to run inside the same environment.

I have created a new directory. And then inside it I ran the command which installs miniforge:

```bash
wget "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"
bash Miniforge3-$(uname)-$(uname -m).sh
```


When asked to initialize it on the shell I decided against it therefore I have to execute this command any time I need to activate it for the session:

```bash
eval "$(~/miniforge3/bin/conda shell.bash hook)"
```


## Environmental setup

We have to create a new virtual environment. This is done with:
```bash
conda create -y -n lerobot python=3.12
```

But you also have to activate lerobot with:
```bash
source ~/lerobot-env/bin/activate
```

And now to activate and deactivate the environment we use:
```bash
conda activate lerobot
conda deactivate
```

On the other hand I also installed:
```bash
conda install evdev -c conda-forge
```
Since I am using WSL.


Then we install the video decoder. 
```bash
conda install ffmpeg -c conda-forge
```



### LeRobot Installation 

We clone and enter in the newly created directory:
```bash
git clone https://github.com/huggingface/lerobot.git
cd lerobot
```

Then we install the library in an editable mode and then we install the base package.
```bash
pip install -e .    #editable
```

```bash
pip install lerobot
```

```bash
pip install -e ".[smolvla]"
```

And to confirm that it was correct we execute the following command:
```bash
lerobot-info
```

And my result is this:
```bash
- LeRobot version: 0.5.2
- Platform: Linux-6.6.87.2-microsoft-standard-WSL2-x86_64-with-glibc2.35
- Python version: 3.12.13
- Huggingface Hub version: 1.11.0
- Transformers version: 5.3.0
- Datasets version: N/A
- Numpy version: 2.2.6
- FFmpeg version: N/A
- PyTorch version: 2.10.0+cu128
- Is PyTorch built with CUDA support?: True
- Cuda version: 12.8
- GPU model: NVIDIA GeForce RTX 3050 Ti Laptop GPU
- Using GPU in script?: <fill in>
- lerobot scripts: ['lerobot-calibrate', 'lerobot-dataset-viz', 'lerobot-edit-dataset', 'lerobot-eval', 'lerobot-find-cameras', 'lerobot-find-joint-limits', 'lerobot-find-port', 'lerobot-imgtransform-viz', 'lerobot-info', 'lerobot-record', 'lerobot-replay', 'lerobot-setup-can', 'lerobot-setup-motors', 'lerobot-teleoperate', 'lerobot-train', 'lerobot-train-tokenizer']
```

Therefore it means that it was installed correctly. 


### Genesis implementation 

I have installed Genesis in another directory which has another virtual environment. They cannot communicate with each other thus they should have unique namespaces with respect to each other. Because having smolVLA in a specific virtual environment and Genesis in another, will cause problems and version collisions. As a result within the **active** lerobot virtual environment I execute this command: 

```bash
pip install genesis-world
```

Then we create a new directory:
```bash
mkdir genesis_integration
```
 
And that should be it. We shouldn't forget to execute this to allow genesis to function properly:
 
```bash
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH
```

Followed by:
```bash
export LIBGL_ALWAYS_SOFTWARE=1
```
