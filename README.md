## AzkaDev OS

> AzkaDevOS Linux Distro untuk developer based ubuntu, status belum siap pakai public

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
1. [ ] Visual Studio Code
2. [ ] Google Chrome
3. [ ] Telegram

## Package Includes
1. [x] python
2. [ ] node-js
3. [ ] Flutter Dan Dart
4. [ ] Docker
5. [ ] Android Tools adb ndk commandline dll
6. [ ] 

# Faqs

> Q: Bedanya sama ubuntu linux distro biasa lainya apa bang? apa ini lebih cepat?.

> A: Hampir sama cuma di AzkaDevOS ini os khusus developer jadi semua package yang di butuhkan developer terutama saya, sudah terinstall + sudah di atur sesuai style saya, jadi gak perlu repot buang waktu buat install, sama seperti linux ubuntu distro lainya

> Q: Kenapa anda membangun ini?

> A: untuk mempermudah orang yang ingin menggunakan linux untuk developer, jadi tinggal sat set

## Credit
1. [ubuntu-iso-builder](https://github.com/Ubuntu-Cinnamon-Remix/iso-builder-devel)