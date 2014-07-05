tie.js
======

tie dom and object

##usage

    tie(objectPoint ,"objectProperty" ,elementPoint ,"elementProperty" ,"directive");
    tie(objectPoint ,"objectProperty" ,elementPoint ,"elementProperty" ,function directive(){});

##how

use Object.defineProperty(objectPoint ,"objectProperty") and Object.defineProperty(elementPoint ,"elementProperty") for watch.  
if object or element change directive will be excute  
element = elementPoint[elementProperty]  
value = objectPoint[objectProperty]  
if element or value change directive will be excute  
