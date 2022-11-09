FROM debian:latest

VOLUME [ "/proc:/proc", "/workspaces/AzkaDevOS:/working_dir" ]  

WORKDIR /working_dir

RUN echo "azka" > /workspaces/AzkaDevOS/baru.txt

CMD [ "pwd" ]