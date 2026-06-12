/** Termos legais padrao para impressao de orcamento e ordem de servico. */
export default function PrintLegalTerms() {
  return (
    <section className="print-legal-terms text-[11px] leading-[1.35] text-[#444]">
      <h3 className="text-[12px] font-bold text-[#111] mb-1">TERMOS DE GARANTIA</h3>
      <div className="space-y-1 mb-2.5 text-justify">
        <p>
          Este termo de garantia atende exclusivamente aos serviços executados, peças substituídas,
          produtos aplicados e componentes instalados no veículo, conforme discriminado neste
          orçamento ou ordem de serviço.
        </p>
        <p>
          A garantia será aplicada somente sobre os serviços realizados pela oficina e sobre as
          peças, produtos ou componentes fornecidos e/ou indicados pela própria oficina, respeitando
          os prazos legais previstos pelo Código de Defesa do Consumidor — CDC, bem como as
          condições específicas de cada serviço, peça ou produto utilizado.
        </p>
        <p>
          Peças, produtos, componentes ou serviços fornecidos, executados ou indicados por
          terceiros, sem indicação ou responsabilidade da oficina, não possuem garantia por parte
          da oficina. Caso o cliente opte por utilizar peças, produtos ou serviços de terceiros
          não indicados pela oficina, declara estar ciente de que qualquer falha, incompatibilidade,
          mau funcionamento, necessidade de correção, nova análise, retrabalho ou substituição
          poderá gerar cobrança adicional de serviço técnico, podendo ser cobrado em valor dobrado
          em relação ao serviço técnico padrão, conforme avaliação da oficina.
        </p>
        <p>
          A garantia não cobre danos causados por mau uso, falta de manutenção preventiva, uso
          inadequado do veículo, combustível de má qualidade ou adulterado, acidentes, colisões,
          alagamentos, superaquecimento, alterações elétricas, eletrônicas ou mecânicas realizadas
          por terceiros, adaptações não autorizadas, desgaste natural de peças, componentes externos
          ao serviço executado ou qualquer falha não relacionada diretamente ao serviço realizado
          pela oficina.
        </p>
        <p>
          A garantia poderá ser invalidada caso o veículo, peça ou componente seja violado,
          desmontado, reparado, alterado ou manipulado por terceiros após a execução do serviço
          pela oficina.
        </p>
      </div>

      <h3 className="text-[12px] font-bold text-[#111] mb-1">OBSERVAÇÕES</h3>
      <ol className="list-decimal list-outside pl-4 space-y-0.5 text-justify print:columns-2 print:gap-x-5">
        <li>
          Para a realização de qualquer análise técnica, caso o veículo se encontre em condições
          que dificultem ou impossibilitem a avaliação, como excesso de sujeira, vazamentos,
          oxidação, corrosão, peças quebradas, ausência de componentes, instalações irregulares,
          adaptações, danos aparentes ou qualquer outra condição que impeça a correta verificação do
          problema, poderá ser necessária limpeza, desmontagem, teste ou serviço prévio. Este
          procedimento poderá ser cobrado separadamente.
        </li>
        <li>
          Veículos que apresentarem avarias, danos estéticos ou estruturais, como riscos,
          amassados, trincas, peças quebradas, componentes soltos, ferrugem, vazamentos, sinais de
          colisão, adaptações ou qualquer irregularidade visível, terão essas condições registradas
          previamente pela oficina.
        </li>
        <li>
          Veículos que derem entrada com falhas como não funcionamento, pane elétrica, pane
          mecânica, superaquecimento, vazamentos, ruídos, dificuldade de partida, perda de potência,
          falhas eletrônicas, problemas de alimentação, falhas de ignição, mau funcionamento geral
          ou qualquer outra condição que impeça seu uso normal serão considerados em estado de
          análise técnica, sendo necessário aguardar diagnóstico posterior.
        </li>
        <li>
          O prazo para análise técnica poderá variar conforme a complexidade do problema,
          necessidade de desmontagem, realização de testes, disponibilidade da agenda da oficina,
          disponibilidade de peças, produtos ou retorno do cliente. O prazo estimado poderá variar
          de 01 (um) a 07 (sete) dias úteis, podendo ser prorrogado em casos de maior complexidade
          técnica, falta de peças, espera por fornecedores, realização de serviços terceirizados ou
          ausência de resposta do cliente.
        </li>
        <li>
          A validade deste orçamento fica estipulada em 15 (quinze) dias a partir da sua emissão ou
          comunicação ao cliente. Após esse prazo, os valores de peças, produtos, componentes, mão
          de obra, serviços e disponibilidade poderão sofrer alterações sem aviso prévio, sendo
          necessária nova conferência ou atualização do orçamento.
        </li>
        <li>
          Após a finalização da análise técnica e envio do orçamento, o cliente deverá informar sua
          aprovação ou não autorização do serviço. Em caso de não aprovação do orçamento, o cliente
          terá o prazo de 03 (três) dias para retirada do veículo, peça ou componente, contados a
          partir da comunicação da não autorização.
        </li>
        <li>
          Caso o orçamento não seja aprovado e o veículo, peça ou componente não seja retirado
          dentro do prazo de 03 (três) dias após a não autorização, poderá ser cobrada taxa de
          pátio, permanência, estadia ou armazenamento, conforme política da oficina.
        </li>
        <li>
          A taxa de estadia, pátio ou permanência não será cobrada quando o veículo, peça ou
          componente permanecer na oficina por motivo de espera de entrega de peças, produtos ou
          componentes, ou quando houver necessidade de aguardar a realização de serviços
          terceirizados previamente autorizados pelo cliente e vinculados ao serviço aprovado.
        </li>
        <li>
          Para veículos, peças ou componentes deixados para análise, orçamento ou serviço, após a
          comunicação ao cliente para retirada, aprovação ou demais providências, poderá ser
          concedido prazo de permanência conforme orientação da oficina. Após esse prazo, poderão
          ser aplicadas taxas de armazenamento, pátio ou permanência.
        </li>
        <li>
          Para serviços não autorizados, não aprovados ou não executados, poderá ser cobrada taxa
          referente à análise técnica, diagnóstico, desmontagem, testes, orçamento, permanência em
          bancada ou tempo técnico utilizado para identificação do problema.
        </li>
        <li>
          A oficina não se responsabiliza por objetos pessoais, acessórios, documentos, ferramentas,
          valores ou quaisquer pertences deixados no interior do veículo ou junto aos componentes
          entregues para análise. Recomenda-se que o cliente retire todos os pertences antes da
          entrada do veículo na oficina.
        </li>
        <li>
          A aprovação do orçamento poderá ser realizada de forma presencial, por telefone,
          mensagem, WhatsApp, assinatura física, assinatura digital, sistema online ou qualquer outro
          meio de comunicação utilizado entre cliente e oficina.
        </li>
        <li>
          A retirada do veículo, peça ou componente somente será liberada após a quitação total dos
          valores referentes a serviços, peças, produtos, diagnósticos, taxas, estadias ou demais
          despesas acordadas.
        </li>
      </ol>
    </section>
  );
}
