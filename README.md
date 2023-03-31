# Horsa: apiBusinessGateway
API Gateway per le api di M3

##SAPStockInquiry
- Accetta n items
- Accetta n warehouses
- Accetta n date

/sapStockInquiry?warehouses=I99,I97,I9M,I95&items=02612451,02612453&atps=I99&dates=20230315,20230415,20230515

Per ciascuna occorrenza chiama OIS100MI.GetATP.
Ritorna la quantità a quella data.


##SAPStock
- Accetta n items

Per ogni item chiama CMS100MI/LstSAPAvail - basata su MITBAL
