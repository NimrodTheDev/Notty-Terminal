from django.db import connection

def analysis(queryset, show_query:bool = False):
    sql, params = queryset.query.sql_with_params()
    if show_query: print(queryset.query)
    try:
        with connection.cursor() as cursor:
            cursor.execute("EXPLAIN ANALYZE " + sql, params)
            for row in cursor.fetchall():
                print(row[0])
    except Exception as e:
        print(e)