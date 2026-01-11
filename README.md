# P2PCluedoe
A P2P Clue/Cluedo Game made using PeerJS

An old favourite and classic Cluedoe P2P game, with themes!


Currently only two themes, Cluedoe Classic (with some extra fun playable detectives) and Strange Things.

**NOTE:** This is intended for self hosting on a Pi or similar to play with friends and family over locally. Not intended to be hosted online. While this is local this will need internet connectivity for PeerJS

**Setup:**
```
sudo su

apt install lighttpd

mkdir /var/www/html/cluedoe

copy all files to above location.

chown -R www-data:www-data /var/www/html/cluedoe

chmod 755 /var/www/html/cluedoe

chmod 644 /var/www/html/cluedoe/*

cp -v 79-cluedoe.conf /etc/lighttpd/conf-enabled/

systemctl restart lighttpd

access at http://DEVICE-IP/cluedoe
```
