## This ISO Builder

This ISO builder was basically a combination of previous efforts from Ubuntu
Budgie (budgie-remix at the time), some stuff from livecd-rootfs from launchpad
and Elementary OS, thanks to the amazing devs from all around!
Elem Link: https://github.com/elementary/os

## Why not just fork from livecd-rootfs?

The Ubuntu ISO's are built with ubuntu-cdimage scripts and with livecd-rootfs,
but it has a lot of extra scripts that are hard to navigate all at once unless
you have previous experience and is a bottomless well of asterisks attached to it.
It's better to get something not perfect, but close enough.

## Building Locally

As UCR is built with the Debian version of `live-build`, not the Ubuntu patched version, it's easiest to build an iso in a Debian VM or container. This prevents messing up your host system too.

The following example uses Docker and assumes you have Docker correctly installed and set up:

 1) Clone this project & `cd` into it:

    ```
    git clone https://github.com/Ubuntu-Cinnamon-Remix/iso-builder && cd iso-builder
    ```

 2) Configure the channel in the `etc/terraform.conf` (unstable, all).

 3) Run the build:

    ```
    docker run --privileged -i -v /proc:/proc \
        -v ${PWD}:/working_dir \
        -w /working_dir \
        debian:latest \
        /bin/bash -s etc/terraform.conf < build.sh
    ```

 4) When done, your image will be in the `builds` folder.
# AzkaDevOS
