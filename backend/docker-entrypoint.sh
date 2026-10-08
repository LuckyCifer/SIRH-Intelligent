#!/bin/sh
set -e

echo "Attente de MySQL (${DB_HOST}:${DB_PORT})..."
until python -c "import pymysql,os; pymysql.connect(host=os.environ['DB_HOST'], port=int(os.environ['DB_PORT']), user=os.environ['DB_USER'], password=os.environ['DB_PASSWORD'])" 2>/dev/null; do
  sleep 2
done

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${LOAD_DEMO_DATA}" = "True" ]; then
  echo "Chargement des données de démo..."
  python manage.py shell --command="exec(open('fixtures/demo_data.py', encoding='utf-8').read())"
fi

exec "$@"
