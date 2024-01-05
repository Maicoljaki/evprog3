const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());
const supabaseUrl = 'https://xditqalrvetmffhboygq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXRxYWxydmV0bWZmaGJveWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ0MTU3MTQsImV4cCI6MjAxOTk5MTcxNH0.TJ2AYMSI-dhw85BgdihWvlW-fJfmxPgn6H1nBKvwpGU';
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/georef/:usuario', async (req, res) => {
  const usuario = req.params.usuario;

  try {
    const { data: userData, error: userError } = await supabase
      .from('clientes')
      .select('*')
      .eq('nombre_usuario', usuario)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const ciudad = userData.ciudad;
    const userWithCityData = { ...userData };
    const { data: existingCityData, error: cityError } = await supabase
      .from('ciudad')
      .select('*')
      .eq('nombre', ciudad)
      .single();

    if (!cityError && existingCityData) {
      userWithCityData.cityLongt = existingCityData.longt;
      userWithCityData.cityLatt = existingCityData.latt;
      userWithCityData.cityProv = existingCityData.prov;
    } else {
      const cityDataResponse = await axios.get(`https://geocode.xyz/${ciudad}?json=1`);
      const cityData = cityDataResponse.data;
      if (cityData.standard) {
        const { longt, latt, standard } = cityData;
        userWithCityData.cityLongt = longt;
        userWithCityData.cityLatt = latt;
        userWithCityData.cityProv = standard.prov;
        await supabase.from('ciudad').insert([
          {
            nombre: ciudad,
            longt,
            latt,
            prov: standard.prov
          }
        ]);
      } else {
        return res.status(404).json({ error: 'Ciudad no encontrada en la API de geocode' });
      }
    }

    res.json(userWithCityData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los datos de georreferenciación' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor corriendo en http://localhost:${port}`));
