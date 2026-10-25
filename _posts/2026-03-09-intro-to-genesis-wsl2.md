---
title: "Intro to Genesis: setting it up on WSL2"
tags: [genesis, wsl2, cuda, setup]
---

This whole operation is being done on WSL2. The OS inside the WSL is Ubuntu 22.04.5 LTS (jammy jellyfish). 

Before we do anything we need to install the correct CUDA toolkit which will allow us to use PyTorch properly. Before we continue with the guide found on the NVIDIA site we execute this command on the terminal: 
```bash
sudo apt-key del 7fa2af80
```
(this command is used to clean up old legacy methods that might interfere with the new methodology. Since NVIDIA has [moved on](https://developer.nvidia.com/blog/updating-the-cuda-linux-gpg-repository-key/) from the old method of saving CUDA repository keys)

Followed by these [commands](https://developer.nvidia.com/cuda-12-6-0-download-archive?target_os=Linux&target_arch=x86_64&Distribution=WSL-Ubuntu&target_version=2.0&target_type=deb_network) (in my case):

```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/wsl-ubuntu/x86_64/cuda-keyring_1.1-1_all.deb

sudo dpkg -i cuda-keyring_1.1-1_all.deb

sudo apt-get update

sudo apt-get -y install cuda-toolkit-12-6
```

We go to our bashrc and add this at the end: 
```bash
export PATH=/usr/local/cuda-12.6/bin${PATH:+:${PATH}}
```

We update the WSL to ensure that we have the latest updates. After that I created a new directory where I ran the command `python3 -m venv env1` to create a new virtual environment. In my case, even though I updated with `sudo apt update && sudo apt upgrade` I still had to manually install the command to create the virtual environment: 
```bash
sudo apt install python3.10-venv
```

After the creation of the new virtual environment I activated it with:
```bash
source env1/bin/activate
```
and then installed PyTorch inside of it by following this [guide](https://pytorch.org/get-started/locally/). 

Now everything is set up and I will install Genesis. Firstly we make sure that we have the latest pip version with: `pip install --upgrade pip`

After that we install by using the GitHub version instead of the: `pip install genesis-world`
The issue with the aforementioned command is that sometimes old versions of the Genesis engine are installed and not the latest one. To circumvent this we use this command:
`pip install git+https://github.com/Genesis-Embodied-AI/Genesis.git`

After the installation we try to run the first project. However if we try to run with gpu an error shows:
```bash
[E 03/09/26 10:32:53.504 1112] [cuda_driver.h:operator()@93] CUDA Error CUDA_ERROR_NO_DEVICE: no CUDA-capable device is detected while calling init (cuInit)


Traceback (most recent call last):
File "/home/user/genesis/test.py", line 2, in <module>
gs.init(backend=gs.gpu)
File "/home/user/genesis/env1/lib/python3.10/site-packages/genesis/__init__.py", line 274, in init
qd.init(
File "/home/user/genesis/env1/lib/python3.10/site-packages/quadrants/lang/misc.py", line 446, in init
impl.get_runtime().create_program()
File "/home/user/genesis/env1/lib/python3.10/site-packages/quadrants/lang/impl.py", line 430, in create_program
self._prog = _qd_core.Program()
RuntimeError: [cuda_driver.h:operator()@93] CUDA Error CUDA_ERROR_NO_DEVICE: no CUDA-capable device is detected while calling init (cuInit)

[Genesis] [10:32:53] [ERROR] RuntimeError: [cuda_driver.h:operator()@93] CUDA Error CUDA_ERROR_NO_DEVICE: no CUDA-capable device is detected while calling init (cuInit)
```

To solve this issue I used the suggestion on the Genesis site by updating the library path:
```bash
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH
```
The latter has to be done only after I confirmed that the *libcuda.so* is found on the lib folder:
`ls /usr/lib/wsl/lib/`


The main problem being faced right now is the fact that in the screen the robot is not being shown. A new window is being created however I can only see a black screen with the instructions on it. The latter also do not work properly as they seem to flicker when I try to access them.


![The black screen when I execute]({{ '/assets/photos/genesis-black-screen.png' | relative_url }})


The fix is adding this code snippet right before the import genesis:
```python
import os
os.environ['LIBGL_ALWAYS_SOFTWARE'] = '1'   #force to render on CPU
os.environ['MESA_GL_VERSION_OVERRIDE'] = '3.3' #force mesa to use a OpenGL version that is compatible with the Genesis requirement of having a 3+ version
os.environ['PYOPENGL_PLATFORM'] = 'glx' #decides the windowing system
```

The solution above is a trade-off. The physical computation is being done by the GPU. While the visualization is being done by the CPU. The latter is due to the aforementioned bug. 

However we face an issue when we try to rotate the camera, because the simulation seems to not respond. This is because we are doing the visualization on the CPU, which is also responsible for the mouse movements. So the visualization is starved. 


To clear the cache (in case it is corrupted): 
```bash
rm -rf ~/.cache/taichi
```


## Recap: Setup for following executions

In the root directory of our environment you have to execute this command:
```bash
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH
```

Then you need to enter the directory where the environment will be built to execute:
```bash
source env1/bin/activate
```
