---
title: "Gazebo setup on WSL"
tags: [linux, bash]
skills: [Bash, Linux, Gazebo]
description: "Getting Gazebo to render on WSL by forcing it onto my NVIDIA GPU instead of the integrated one."
---

We want to install Gazebo on our WSL environment. Lets start with a simple update and restart to make sure that our WSL is up to date. In the windows powershell we want to run:
```bash
wsl --update
wsl --shutdown
```


Then we make sure that Gazebo's graphical output is passing through WSL. So we execute this command inside the WSL terminal. (the output should be *:0*)
```bash
echo $DISPLAY
```

If that is not the case then we should execute these commands one after the other:
```bash
echo "export DISPLAY=:0" >> ~/.bashrc 
echo "export LIBGL_ALWAYS_INDIRECT=0" >> ~/.bashrc 
source ~/.bashrc
```


Then we try to run:
```bash
gz sim shapes.sdf
```

In my case a white window opens:
![[crash.png]]

Nothing is being shown in this window and I cannot close it without needed to kill it in the terminal with `ctrl+c`. A suggestion is to kill the lingering Gazebo server and then force WSL to use X11 instead of Wayland. (in my case it didn't work)
```bash
export QT_QPA_PLATFORM=xcb
unset WAYLAND_DISPLAY
```


Hence I will need to go further down to see if WSL is actually communicating with the GPU or not:
```bash
glxinfo -B | grep "Device"
```
The result should be the name of the specific laptop GPU, however I get the integrated graphics card and not the dedicated one, explaining the stalling. 


We can try to force the Mesa D3D12 driver to explicitly select the NVIDIA GPU:
```bash
export MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA
```
Which now displays the correct gpu: `Device: D3D12 (NVIDIA GeForce RTX 3050 Ti Laptop GPU) (0xffffffff)`

But since WSL environment is 'restored' every time we close and the open it we want it to be automatically routed. Hence we can just add this variable in our shell configuration: 
```bash
echo "export MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA" >> ~/.bashrc
```
To confirm that it was executed properly:
```bash
tail -n 1 ~/.bashrc
```
The result should be: `export MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA`

Now we rerun the gazebo simulation. But to make it easier for us to see if something is going wrong we make it so the diagnostic log is shown in the terminal:
```bash
gz sim shapes.sdf -v 4
```

Now our execution is perfect. We have achieved what we set out to do:
![[correcct.png]]

I closed and reopened the terminal and nothing was broken. Great success!
