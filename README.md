## AzkaDev OS

> AzkaDevOS Linux Distro untuk developer based ubuntu

## Develop

1. Clone dulu reponya
```bash
git clone https://github.com/azkadev/AzkaDevOS.git
```

## Build

```bash
sudo su
apt update && apt install debootstrap -y
./build.sh etc/terraform.conf
```

## Apps include
1. [x] Visual Studio Code
2. [x] Google Chrome
3. [x] Telegram

## Package Includes
1. [x] python
2. [ ] node-js
3. [ ] Flutter Dan Dart

## Faqs

Q: Bedanya sama ubuntu linux distro biasa lainya apa bang? apa ini lebih cepat?
A: Hampir sama cuma di AzkaDevOS ini os khusus developer jadi semua package yang di butuhkan developer terutama saya sudah terinstall + sudah di atur sesuai style saya jadi gak perlu repot buang waktu buat install, sama seperti linux ubuntu distro lainya

## Credit
1. [ubuntu-iso-builder](https://github.com/Ubuntu-Cinnamon-Remix/iso-builder-devel)