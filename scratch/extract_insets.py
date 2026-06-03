import geopandas as gpd

gpkg_path = r"C:\Users\lixov\OneDrive\Ambiente de Trabalho\PR Regional\Circulos NW Populacao.gpkg"
output_path = r"resultados_geo\semilocal_insets.geojson"

list_of_districts = [
    'Pará-5', 'Distrito Federal-1', 'Goiás-4', 'Ceará-5',
    'Pernambuco-5', 'Pernambuco-6', 'Pernambuco-2', 'Bahia-8',
    'Minas Gerais-5', 'Minas Gerais-8', 'Minas Gerais-10',
    'São Paulo-10', 'São Paulo-1', 'São Paulo-12', 'São Paulo-5',
    'São Paulo-7', 'São Paulo-8', 'São Paulo-6', 'São Paulo-20',
    'São Paulo-3', 'São Paulo-4', 'São Paulo-13', 'São Paulo-18', 'São Paulo-19', 'São Paulo-2',
    'Rio de Janeiro-1', 'Rio de Janeiro-2', 'Rio de Janeiro-3', 'Rio de Janeiro-4', 'Rio de Janeiro-5', 'Rio de Janeiro-6', 'Rio de Janeiro-7', 'Rio de Janeiro-8',
    'Paraná-6', 'Rio Grande do Sul-5', 'Rio Grande do Sul-6'
]

print("Carregando GPKG...")
gdf = gpd.read_file(gpkg_path, layer='Circulos NW Populacao')

print("Processando sub_name...")
gdf['sub_name'] = gdf['estado'] + '-' + gdf['id_local'].astype(str)

print("Filtrando distritos...")
filtered_gdf = gdf[gdf['sub_name'].isin(list_of_districts)].copy()

print(f"Encontrados {len(filtered_gdf)} de {len(list_of_districts)} distritos desejados.")

# Mantendo as propriedades corretas como no semilocal_insets.geojson original
filtered_gdf = filtered_gdf[['sub_name', 'estado', 'id_local', 'populacao', 'geometry']]

print("Salvando GeoJSON...")
filtered_gdf.to_file(output_path, driver='GeoJSON')
print("Concluído!")
