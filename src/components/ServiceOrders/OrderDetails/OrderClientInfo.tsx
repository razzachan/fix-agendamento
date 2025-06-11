
import React from 'react';
import { Wrench, Phone, Mail, CreditCard } from 'lucide-react';
import { ServiceOrder } from '@/types';
import LocationInfo from '../LocationInfo';
import AssignTechnicianButton from './AssignTechnicianButton';

interface OrderClientInfoProps {
  order: ServiceOrder;
  onOrderUpdated?: (updatedOrder: ServiceOrder) => void;
}

const OrderClientInfo: React.FC<OrderClientInfoProps> = ({ order, onOrderUpdated }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm text-muted-foreground mb-1">Cliente</h3>
        <p className="font-medium text-lg">{order.clientName}</p>
      </div>

      {order.clientPhone && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">Telefone</h3>
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
            <p>
              <a href={`tel:${order.clientPhone.replace(/\D/g, '')}`} className="hover:underline">
                {order.clientPhone}
              </a>
              {order.clientPhone && (
                <a
                  href={`https://wa.me/55${order.clientPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-green-600 hover:underline text-sm"
                >
                  WhatsApp
                </a>
              )}
            </p>
          </div>
        </div>
      )}

      {order.clientEmail && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">Email</h3>
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
            <p>
              <a href={`mailto:${order.clientEmail}`} className="hover:underline">
                {order.clientEmail}
              </a>
            </p>
          </div>
        </div>
      )}

      {order.clientCpfCnpj && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">CPF/CNPJ</h3>
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
            <p>{order.clientCpfCnpj}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium text-sm text-muted-foreground mb-1">Técnico</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
            {order.technicianName ? (
              <p>{order.technicianName}</p>
            ) : (
              <p className="text-muted-foreground italic">Não atribuído</p>
            )}
          </div>
          {onOrderUpdated && (
            <AssignTechnicianButton
              order={order}
              onOrderUpdated={onOrderUpdated}
            />
          )}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm text-muted-foreground mb-1">Localização Atual</h3>
        <div className="flex items-center">
          <div className="mr-2">
            <LocationInfo location={order.currentLocation} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderClientInfo;
