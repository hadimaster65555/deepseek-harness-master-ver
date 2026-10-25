#!/bin/sh
set -eu
ssh-keygen -q -t ed25519 -N '' -f /etc/ssh/ssh_host_ed25519_key
install -d -m 700 -o mh -g mh /home/mh/.ssh
install -m 600 -o mh -g mh /fixture-key.pub /home/mh/.ssh/authorized_keys
install -d -m 700 -o mh -g mh /home/mh/workspace
exec /usr/sbin/sshd -D -e -f /etc/ssh/sshd_config
