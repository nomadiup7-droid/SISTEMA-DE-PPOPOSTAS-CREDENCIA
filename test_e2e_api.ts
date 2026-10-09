async function run() {
  const baseUrl = 'http://localhost:3005/api';

  console.log('--- 1. Testing Draft Creation Without Client ---');
  const resDraft = await fetch(`${baseUrl}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'draft',
      eventName: 'Congresso Anual 2026',
      items: [
        {
          serviceName: 'Credenciamento por participante',
          unit: 'participante',
          unitPrice: 5,
          quantity: 200,
          discount: 0,
          total: 1000
        }
      ]
    })
  });
  const draftData = await resDraft.json();
  console.log('resDraft status:', resDraft.status, draftData);
  console.log('Draft created:', draftData.number, 'Status:', draftData.status, 'Client:', draftData.clientId);

  console.log('--- 2. Attempting to generate PDF without client ---');
  const resPdfNoClient = await fetch(`${baseUrl}/proposals/${draftData.id}/pdf`);
  console.log('PDF response status without client:', resPdfNoClient.status);
  const pdfError = await resPdfNoClient.json();
  console.log('Error message:', pdfError.error);
  if (pdfError.error !== 'Selecione ou cadastre um cliente antes de finalizar esta proposta.') {
    throw new Error('Expected exact client required message');
  }

  console.log('--- 3. Create Client: João & Silva Produções ---');
  const resClient = await fetch(`${baseUrl}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'João & Silva Produções',
      document: '12.345.678/0001-90',
      email: 'contato@joaoesilva.com.br',
      phone: '11 98765-4321',
      city: 'São Paulo',
      state: 'SP'
    })
  });
  const clientData = await resClient.json();
  console.log('Client created:', clientData.id, clientData.name);

  console.log('--- 4. Update Proposal with Client ---');
  const resUpdate = await fetch(`${baseUrl}/proposals/${draftData.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...draftData,
      clientId: clientData.id,
      clientSnapshot: clientData,
      status: 'generated'
    })
  });
  const updatedProposal = await resUpdate.json();
  console.log('Proposal updated with client:', updatedProposal.number);

  console.log('--- 5. Generate PDF with Client ---');
  const resPdf = await fetch(`${baseUrl}/proposals/${draftData.id}/pdf`);
  console.log('PDF response status:', resPdf.status);
  const contentDisp = resPdf.headers.get('content-disposition');
  console.log('Content-Disposition header:', contentDisp);
  if (!contentDisp || !contentDisp.includes('Proposta_') || !contentDisp.includes('Joao-e-Silva-Producoes.pdf')) {
    throw new Error(`Unexpected Content-Disposition: ${contentDisp}`);
  }

  console.log('--- 6. Duplicate Proposal ---');
  const resDup = await fetch(`${baseUrl}/proposals/${draftData.id}/duplicate`, {
    method: 'POST'
  });
  const dupData = await resDup.json();
  console.log('Duplicated proposal number:', dupData.number);
  console.log('Original number:', draftData.number);
  console.log('Client preserved:', dupData.clientId === clientData.id);
  if (dupData.number === draftData.number) {
    throw new Error('Duplicated proposal must have a new number');
  }
  if (dupData.clientId !== clientData.id) {
    throw new Error('Duplicated proposal must preserve client');
  }

  console.log('ALL SERVER E2E TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
