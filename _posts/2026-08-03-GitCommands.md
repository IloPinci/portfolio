---
title: "Some Useful GitCommands"
tags: [git]
---


Initialize git:
```bash
git init
```

Connect to a new repo:
```bash
git remote add origin <link>
```

Add the files:
```bash
git remote add .
```

Commit the files:
```bash
git commit -m "Comment"
```

Create new branch:
```bash
git checkout -b <branchName>
```

Push to repo/branch:
```bash
git push -u origin <branchName>
```

In case you added new branches and their existence is not updated in the local one. We update the status with:
```bash
git fetch origin 
```

To look at all the branches :
```bash
git branch -a
```

Clone a specific branch:
```bash
git clone -b <branchName> --single-branch https://github.com/user/repo.git
```

To go to the root of the git repo:
```bash
cd $(git rev-parse --show-toplevel)
```

To remove the previous commits we execute:
```bash
git rm -rf --cached .
```
