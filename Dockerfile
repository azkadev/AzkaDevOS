FROM debian:latest

WORKDIR /app/

ADD ./ /app/

RUN apt update && apt install debootstrap -y

RUN ./build.sh etc/terraform.conf