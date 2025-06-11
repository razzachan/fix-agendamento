import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { weatherService, WeatherData } from '@/services/weatherService';
import {
  Thermometer,
  Droplets,
  Wind,
  Eye,
  MapPin,
  RefreshCw,
  CloudRain,
  Gauge,
  Sun,
  Sunrise,
  Sunset
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherCardProps {
  className?: string;
  compact?: boolean;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ 
  className,
  compact = false 
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadWeather = async () => {
    try {
      setIsLoading(true);
      console.log('🌤️ [WeatherCard] Carregando dados meteorológicos...');

      // Limpar cache para forçar dados atualizados
      weatherService.clearCache();

      const weatherData = await weatherService.getCurrentLocationWeather();

      if (weatherData) {
        setWeather(weatherData);
        setLastUpdated(new Date());
        console.log('✅ [WeatherCard] Dados meteorológicos carregados:', weatherData);
      }
    } catch (error) {
      console.error('❌ [WeatherCard] Erro ao carregar clima:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
    
    // Atualizar a cada 10 minutos
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-20">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Clima indisponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weatherIcon = weatherService.getWeatherIcon(weather.condition);

  if (compact) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className={cn(
          'p-4 text-white relative',
          weatherIcon.background
        )}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 text-6xl">
              {weatherIcon.emoji}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(weather.temperature)}°C
                </div>
                <div className="text-sm opacity-90">
                  {weather.description}
                </div>
              </div>
              <div className="text-3xl">
                {weatherIcon.emoji}
              </div>
            </div>

            {/* Informações extras compactas */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <CloudRain className="w-3 h-3" />
                <span>{weather.rainChance}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3" />
                <span>{weather.windSpeed}km/h</span>
              </div>
            </div>

            <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
              <MapPin className="w-3 h-3" />
              {weather.city}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className={cn(
        'p-0 text-white relative min-h-[200px]',
        weatherIcon.background
      )}>
        {/* Background decorativo */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-4 text-8xl">
            {weatherIcon.emoji}
          </div>
          <div className="absolute bottom-4 left-4 text-6xl opacity-50">
            {weatherIcon.emoji}
          </div>
        </div>
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{weather.city}</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Agora
            </Badge>
          </div>

          {/* Temperatura principal */}
          <div className="flex items-center gap-4 mb-6">
            <div className="text-5xl">
              {weatherIcon.emoji}
            </div>
            <div>
              <div className="text-4xl font-bold">
                {Math.round(weather.temperature)}°C
              </div>
              <div className="text-lg opacity-90">
                {weather.description}
              </div>
              <div className="text-sm opacity-75">
                Sensação: {Math.round(weather.feelsLike)}°C
              </div>
            </div>
          </div>

          {/* Informações detalhadas */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <CloudRain className="w-5 h-5 mx-auto mb-1 opacity-80" />
              <div className="text-sm font-medium">{weather.rainChance}%</div>
              <div className="text-xs opacity-75">Chuva</div>
            </div>

            <div className="text-center">
              <Droplets className="w-5 h-5 mx-auto mb-1 opacity-80" />
              <div className="text-sm font-medium">{weather.humidity}%</div>
              <div className="text-xs opacity-75">Umidade</div>
            </div>

            <div className="text-center">
              <Wind className="w-5 h-5 mx-auto mb-1 opacity-80" />
              <div className="text-sm font-medium">{weather.windSpeed} km/h</div>
              <div className="text-xs opacity-75">Vento</div>
            </div>
          </div>

          {/* Informações extras */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <Thermometer className="w-4 h-4 mx-auto mb-1 opacity-80" />
              <div className="text-xs font-medium">{Math.round(weather.feelsLike)}°C</div>
              <div className="text-xs opacity-75">Sensação</div>
            </div>

            <div className="text-center">
              <Gauge className="w-4 h-4 mx-auto mb-1 opacity-80" />
              <div className="text-xs font-medium">{weather.pressure}</div>
              <div className="text-xs opacity-75">Pressão</div>
            </div>

            <div className="text-center">
              <Eye className="w-4 h-4 mx-auto mb-1 opacity-80" />
              <div className="text-xs font-medium">{weather.visibility}km</div>
              <div className="text-xs opacity-75">Visibilidade</div>
            </div>

            <div className="text-center">
              <Sun className="w-4 h-4 mx-auto mb-1 opacity-80" />
              <div className="text-xs font-medium">UV {weather.uvIndex}</div>
              <div className="text-xs opacity-75">Índice UV</div>
            </div>
          </div>

          {/* Nascer e pôr do sol */}
          <div className="flex justify-between mt-4 pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Sunrise className="w-4 h-4 opacity-80" />
              <div>
                <div className="text-xs font-medium">{weather.sunrise}</div>
                <div className="text-xs opacity-75">Nascer</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sunset className="w-4 h-4 opacity-80" />
              <div>
                <div className="text-xs font-medium">{weather.sunset}</div>
                <div className="text-xs opacity-75">Pôr do sol</div>
              </div>
            </div>
          </div>

          {/* Última atualização */}
          {lastUpdated && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between text-xs opacity-75">
                <span>
                  Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                <button 
                  onClick={loadWeather}
                  className="flex items-center gap-1 hover:opacity-100 transition-opacity"
                  disabled={isLoading}
                >
                  <RefreshCw className={cn(
                    'w-3 h-3',
                    isLoading && 'animate-spin'
                  )} />
                  Atualizar
                </button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
