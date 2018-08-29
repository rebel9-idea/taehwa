# Clone the repository to your computer

```
git clone https://github.com/rebel9-idea/taehwa
```
# Make changes. After making changes, run:
```
git add *
git commit -m "commitreason"
git push origin master
```

# Then, on server:

```
git fetch --all
git reset --hard origin/master

pm2 reload taehwa
```
