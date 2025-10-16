SELECT 
    "systems_usercoinholdings"."amount_held", 
    ("systems_usercoinholdings"."amount_held" * "systems_coin"."current_price") AS "value", 
    "systems_usercoinholdings"."coin_id" AS "coin_address", 
    "systems_coin"."ticker" AS "coin_ticker", 
    "systems_coin"."name" AS "coin_name", 
    "systems_coin"."current_price" AS "current_price", 
    "systems_coin"."current_marketcap" AS "current_marketcap" 
    FROM "systems_usercoinholdings" 
        INNER JOIN "systems_coin" ON ("systems_usercoinholdings"."coin_id" = "systems_coin"."address") 
        WHERE "systems_usercoinholdings"."user_id" = 4sSkeMUTzu4JtBZZiRdp18iktw1uGFjQyxY6m5kgnpMZ 