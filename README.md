Simple instructions:

1) Root your device
2) Get minimal adb and fastboot
3) adb pull /system/b2g/webapps/keyboard.gaiamobile.org
4) unpack application.zip
5) replace keypad.js
6) repack application.zip
7) adb push keyboard.gaiamobile.org /data/local/webapps
8) adb pull /data/local/webapps/webapps.json
9) Open the file with text editor
10) Find the section keyboard.gaiamobile.org and replace "basePath": "/system/b2g/webapps", with "basePath": "/data/local/webapps",
11) adb push webapps.json /data/local/webapps/
12) adb reboot

Enjoy!



Credits:
Bananahackers for the keyboard manipulation guide

Eren Cizmecioglu for the original fix of Nokia 8110 4G

Me for adapting the code to the nokia 800 Tough
