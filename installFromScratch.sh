#
#
#
#


#NETTOYAGE RASPBIAN (pas besoin si raspbian lite)
sudo cp /etc/network/interfaces /etc/network/interfaces.bak
wget https://gist.githubusercontent.com/samatjain/4dda24e14a5b73481e2a/raw/5d9bac8ec40b94833b4e9938121945be252fdee1/Slim-Raspbian.sh -O Slim-Raspbian.sh
sh ./Slim-Raspbian.sh | sudo sh

#UPDATE DEBIAN
sudo apt-get update
sudo apt-get upgrade


#ACTIVATE HARDWARE MODULE REQUIREMENT
sudo modprobe i2c_bcm2708
sudo modprobe i2c_dev
printf "dtparam=i2c_arm=on\n" | sudo tee -a /boot/config.txt

#INSTALL SOFTWARE
sudo apt-get install -y i2c-tools

curl http://www.linux-projects.org/listing/uv4l_repo/lrkey.asc | sudo apt-key add -
printf "deb http://www.linux-projects.org/listing/uv4l_repo/raspbian/ wheezy main\n" | sudo tee -a /etc/apt/sources.list
sudo apt-get update
sudo apt-get install -y uv4l 
sudo apt-get install -y uv4l-server
sudo apt-get install -y uv4l-uvc

curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs

#INSTALL PROCESS MANAGER2 
npm install pm2 -g


#INSTALL NODE MODULE

sudo reboot
